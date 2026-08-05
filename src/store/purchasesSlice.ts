import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import {
  configureRevenueCat,
  customerHasPremium,
  fetchCustomerPremium,
  fetchOfferingsMapped,
  isUserCancelled,
  purchasePlanPackage,
  restoreCustomerPurchases,
  type PlanId,
  type PlanProduct,
} from '../services/revenueCat';
import { createLogger } from '../utils/logger';

const log = createLogger('Purchases');

export type PurchasesStatus = 'idle' | 'loading' | 'ready' | 'error';
export type PurchaseFlowStatus = 'idle' | 'purchasing' | 'restoring';

type PurchasesState = {
  status: PurchasesStatus;
  flowStatus: PurchaseFlowStatus;
  error: string | null;
  plans: PlanProduct[];
  selectedPlan: PlanId;
  isPremium: boolean;
  appUserId: string | null;
  inReview: boolean;
};

const initialState: PurchasesState = {
  status: 'idle',
  flowStatus: 'idle',
  error: null,
  plans: [],
  selectedPlan: 'yearly',
  isPremium: false,
  appUserId: null,
  // Set from Firebase Remote Config `reviewEnabled` on splash.
  inReview: false,
};

export const initPurchases = createAsyncThunk(
  'purchases/init',
  async (appUserId: string) => {
    log.info('Init start', { appUserId });
    await configureRevenueCat(appUserId);
    const [plans, isPremium] = await Promise.all([
      fetchOfferingsMapped().catch(error => {
        log.warn('Offerings failed; continuing with empty plans', error);
        return [] as PlanProduct[];
      }),
      fetchCustomerPremium().catch(error => {
        log.warn('Customer info failed; assuming not premium', error);
        return false;
      }),
    ]);
    log.success('Init done', { planCount: plans.length, isPremium });
    return { appUserId, plans, isPremium };
  },
);

export const purchaseSelectedPlan = createAsyncThunk(
  'purchases/purchase',
  async (packageIdentifier: string, { rejectWithValue }) => {
    log.info('Purchase thunk start', { packageIdentifier });
    try {
      const info = await purchasePlanPackage(packageIdentifier);
      const isPremium = customerHasPremium(info);
      log.success('Purchase thunk done', { isPremium, packageIdentifier });
      return { isPremium };
    } catch (error) {
      if (isUserCancelled(error)) {
        log.warn('Purchase cancelled by user', { packageIdentifier });
        return rejectWithValue({ cancelled: true, message: 'Purchase cancelled' });
      }
      const message =
        error instanceof Error ? error.message : 'Purchase failed. Please try again.';
      log.error('Purchase thunk failed', { packageIdentifier, message, error });
      return rejectWithValue({ cancelled: false, message });
    }
  },
);

export const restorePurchases = createAsyncThunk(
  'purchases/restore',
  async (_, { rejectWithValue }) => {
    log.info('Restore thunk start');
    try {
      const info = await restoreCustomerPurchases();
      const isPremium = customerHasPremium(info);
      log.success('Restore thunk done', {
        isPremium,
        activeEntitlements: Object.keys(info.entitlements.active),
      });
      return { isPremium };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Restore failed. Please try again.';
      log.error('Restore thunk failed', { message, error });
      return rejectWithValue(message);
    }
  },
);

const purchasesSlice = createSlice({
  name: 'purchases',
  initialState,
  reducers: {
    setSelectedPlan(state, action: PayloadAction<PlanId>) {
      state.selectedPlan = action.payload;
    },
    setPremium(state, action: PayloadAction<boolean>) {
      state.isPremium = action.payload;
    },
    setInReview(state, action: PayloadAction<boolean>) {
      state.inReview = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(initPurchases.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(initPurchases.fulfilled, (state, action) => {
        state.status = 'ready';
        state.appUserId = action.payload.appUserId;
        state.plans = action.payload.plans;
        state.isPremium = action.payload.isPremium;
        if (action.payload.plans.some(p => p.plan === state.selectedPlan)) {
          return;
        }
        if (action.payload.plans[0]) {
          state.selectedPlan = action.payload.plans[0].plan;
        }
      })
      .addCase(initPurchases.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message ?? 'Failed to load offerings';
      })
      .addCase(purchaseSelectedPlan.pending, state => {
        state.flowStatus = 'purchasing';
        state.error = null;
      })
      .addCase(purchaseSelectedPlan.fulfilled, (state, action) => {
        state.flowStatus = 'idle';
        state.isPremium = action.payload.isPremium;
      })
      .addCase(purchaseSelectedPlan.rejected, (state, action) => {
        state.flowStatus = 'idle';
        const payload = action.payload as
          | { cancelled?: boolean; message?: string }
          | undefined;
        if (!payload?.cancelled) {
          state.error = payload?.message ?? action.error.message ?? 'Purchase failed';
        }
      })
      .addCase(restorePurchases.pending, state => {
        state.flowStatus = 'restoring';
        state.error = null;
      })
      .addCase(restorePurchases.fulfilled, (state, action) => {
        state.flowStatus = 'idle';
        state.isPremium = action.payload.isPremium;
      })
      .addCase(restorePurchases.rejected, (state, action) => {
        state.flowStatus = 'idle';
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          'Restore failed';
      });
  },
});

export const { setSelectedPlan, setPremium, setInReview } = purchasesSlice.actions;
export const purchasesReducer = purchasesSlice.reducer;

export const selectPlanProduct = (
  state: { purchases: PurchasesState },
  plan: PlanId,
) => state.purchases.plans.find(p => p.plan === plan);

export const selectSelectedPlanProduct = (state: { purchases: PurchasesState }) =>
  selectPlanProduct(state, state.purchases.selectedPlan);

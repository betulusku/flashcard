import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesError,
  type PurchasesOffering,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';

import {
  PREMIUM_ENTITLEMENT_ID,
  PRODUCT_IDS,
  REVENUECAT_API_KEY,
} from '../config/revenueCat';
import {createLogger} from '../utils/logger';

const log = createLogger('RevenueCat');

export type PlanId = 'yearly' | 'weekly';

export type PlanProduct = {
  plan: PlanId;
  packageIdentifier: string;
  productId: string;
  packageType: string;
  title: string;
  price: number;
  priceString: string;
  pricePerMonthString: string | null;
  currencyCode: string;
  hasTrial: boolean;
  trialLabel: string | null;
};

/** Native packages kept outside Redux (non-serializable). */
const packageCache = new Map<string, PurchasesPackage>();

let configured = false;

function isPurchasesError(error: unknown): error is PurchasesError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as PurchasesError).code === 'string'
  );
}

export function isUserCancelled(error: unknown): boolean {
  if (!isPurchasesError(error)) return false;
  return (
    error.userCancelled === true ||
    error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}

export function customerHasPremium(info: CustomerInfo): boolean {
  return Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
}

function trialLabelFor(pkg: PurchasesPackage): string | null {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const unit = intro.periodUnit.toLowerCase();
  const n = intro.periodNumberOfUnits;
  if (unit.includes('day')) return `${n} DAY TRIAL`;
  if (unit.includes('week')) return `${n} WEEK TRIAL`;
  if (unit.includes('month')) return `${n} MONTH TRIAL`;
  return 'TRIAL';
}

function resolvePlan(pkg: PurchasesPackage): PlanId | null {
  const productId = pkg.product.identifier;
  if (productId === PRODUCT_IDS.yearly) return 'yearly';
  if (productId === PRODUCT_IDS.weekly) return 'weekly';

  if (pkg.packageType === PACKAGE_TYPE.ANNUAL) return 'yearly';
  if (pkg.packageType === PACKAGE_TYPE.WEEKLY) return 'weekly';

  const id = `${pkg.identifier} ${productId}`.toLowerCase();
  if (id.includes('year') || id.includes('annual')) return 'yearly';
  if (id.includes('week')) return 'weekly';
  return null;
}

function toPlanProduct(plan: PlanId, pkg: PurchasesPackage): PlanProduct {
  const trial = trialLabelFor(pkg);
  return {
    plan,
    packageIdentifier: pkg.identifier,
    productId: pkg.product.identifier,
    packageType: pkg.packageType,
    title: pkg.product.title,
    price: pkg.product.price,
    priceString: pkg.product.priceString,
    pricePerMonthString: pkg.product.pricePerMonthString,
    currencyCode: pkg.product.currencyCode,
    hasTrial: Boolean(trial),
    trialLabel: trial,
  };
}

function cachePackages(offering: PurchasesOffering | null | undefined) {
  packageCache.clear();
  if (!offering) return;
  for (const pkg of offering.availablePackages) {
    packageCache.set(pkg.identifier, pkg);
  }
}

export function getCachedPackage(packageIdentifier: string): PurchasesPackage | undefined {
  return packageCache.get(packageIdentifier);
}

export function mapOfferingToPlans(offerings: PurchasesOfferings): PlanProduct[] {
  const offering = offerings.current ?? Object.values(offerings.all)[0] ?? null;
  cachePackages(offering);

  if (!offering) {
    log.warn('No current offering from RevenueCat', {
      offeringIds: Object.keys(offerings.all),
      expectedProducts: PRODUCT_IDS,
    });
    return [];
  }

  log.info(`Using offering "${offering.identifier}"`, {
    packageCount: offering.availablePackages.length,
    packages: offering.availablePackages.map(pkg => ({
      id: pkg.identifier,
      productId: pkg.product.identifier,
      type: pkg.packageType,
      price: pkg.product.priceString,
    })),
  });

  const byPlan = new Map<PlanId, PlanProduct>();

  // Prefer exact App Store product ids.
  for (const pkg of offering.availablePackages) {
    if (pkg.product.identifier === PRODUCT_IDS.yearly) {
      byPlan.set('yearly', toPlanProduct('yearly', pkg));
    } else if (pkg.product.identifier === PRODUCT_IDS.weekly) {
      byPlan.set('weekly', toPlanProduct('weekly', pkg));
    }
  }

  // Fallback: package type / name heuristics.
  for (const pkg of offering.availablePackages) {
    const plan = resolvePlan(pkg);
    if (!plan || byPlan.has(plan)) continue;
    byPlan.set(plan, toPlanProduct(plan, pkg));
  }

  const plans = (['yearly', 'weekly'] as const)
    .map(plan => byPlan.get(plan))
    .filter((p): p is PlanProduct => Boolean(p));

  if (plans.length === 0) {
    log.error('Offerings loaded but none matched expected products', {
      expected: PRODUCT_IDS,
      available: offering.availablePackages.map(p => p.product.identifier),
    });
  } else {
    log.success(`Mapped ${plans.length} plan(s)`, plans);
  }

  return plans;
}

export async function configureRevenueCat(appUserId: string): Promise<void> {
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.WARN);
  }

  if (!configured) {
    log.info('Configuring SDK', {
      appUserId,
      apiKeyPrefix: `${REVENUECAT_API_KEY.slice(0, 8)}…`,
      expectedProducts: PRODUCT_IDS,
      entitlement: PREMIUM_ENTITLEMENT_ID,
    });
    Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: appUserId,
    });
    configured = true;
    const resolvedId = await Purchases.getAppUserID();
    log.success('SDK configured', {appUserId: resolvedId});
    return;
  }

  const current = await Purchases.getAppUserID();
  if (current !== appUserId) {
    log.info('Logging in app user', {from: current, to: appUserId});
    const result = await Purchases.logIn(appUserId);
    log.success('logIn complete', {
      appUserId: result.customerInfo.originalAppUserId,
      created: result.created,
      isPremium: customerHasPremium(result.customerInfo),
    });
    return;
  }

  log.debug('SDK already configured for this user', {appUserId: current});
}

export async function fetchOfferingsMapped(): Promise<PlanProduct[]> {
  try {
    log.info('Fetching offerings…');
    const offerings = await Purchases.getOfferings();
    return mapOfferingToPlans(offerings);
  } catch (error) {
    log.error(
      'Failed to fetch offerings from App Store Connect via RevenueCat.',
      {
        expectedProducts: PRODUCT_IDS,
        tip: 'Products must exist under the same App Store Connect app as this bundle id, and be attached to the current RC offering.',
        error: isPurchasesError(error)
          ? {code: error.code, message: error.message}
          : error instanceof Error
            ? error.message
            : error,
      },
    );
    throw error;
  }
}

export async function fetchCustomerPremium(): Promise<boolean> {
  const info = await Purchases.getCustomerInfo();
  const isPremium = customerHasPremium(info);
  log.info('Customer info', {
    appUserId: info.originalAppUserId,
    isPremium,
    activeEntitlements: Object.keys(info.entitlements.active),
  });
  return isPremium;
}

export async function purchasePlanPackage(packageIdentifier: string): Promise<CustomerInfo> {
  const pkg = packageCache.get(packageIdentifier);
  if (!pkg) {
    log.error('Purchase package missing from cache', {
      packageIdentifier,
      cached: [...packageCache.keys()],
    });
    throw new Error('Selected package is not loaded. Try again in a moment.');
  }
  log.info('Purchasing package', {
    packageIdentifier,
    productId: pkg.product.identifier,
    price: pkg.product.priceString,
  });
  try {
    const {customerInfo} = await Purchases.purchasePackage(pkg);
    log.success('Purchase finished', {
      isPremium: customerHasPremium(customerInfo),
      activeEntitlements: Object.keys(customerInfo.entitlements.active),
    });
    return customerInfo;
  } catch (error) {
    if (isUserCancelled(error)) {
      log.warn('Purchase sheet dismissed by user');
    } else {
      log.error('purchasePackage failed', {
        packageIdentifier,
        error: isPurchasesError(error)
          ? {code: error.code, message: error.message}
          : error instanceof Error
            ? error.message
            : error,
      });
    }
    throw error;
  }
}

export async function restoreCustomerPurchases(): Promise<CustomerInfo> {
  log.info('Restoring purchases…');
  try {
    const info = await Purchases.restorePurchases();
    log.success('Restore finished', {
      isPremium: customerHasPremium(info),
      activeEntitlements: Object.keys(info.entitlements.active),
      activeSubscriptions: info.activeSubscriptions,
    });
    return info;
  } catch (error) {
    log.error('restorePurchases failed', {
      error: isPurchasesError(error)
        ? {code: error.code, message: error.message}
        : error instanceof Error
          ? error.message
          : error,
    });
    throw error;
  }
}

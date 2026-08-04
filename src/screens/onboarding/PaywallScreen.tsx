import React, {useEffect, useMemo, useRef, useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {Icon} from '../../components/Icon';
import {AppBarButton} from '../../components/AppBar';
import {markOnboardingComplete} from '../../logic/onboarding';
import type {OnboardingStackParamList} from '../../navigation/OnboardingNavigator';
import {goHomeFaded} from '../../navigation/navTransitions';
import {useAppDispatch, useAppSelector} from '../../store/hooks';
import {
  purchaseSelectedPlan,
  restorePurchases,
  setSelectedPlan,
} from '../../store/purchasesSlice';
import type {PlanId, PlanProduct} from '../../services/revenueCat';
import type {SurveyAnswers} from '../../types/onboarding';
import {colors, radius, spacing} from '../../theme';
import {createLogger} from '../../utils/logger';
import {ScreenShell} from './ScreenShell';

const log = createLogger('Paywall');
const CLOSE_DELAY_MS = 5000;

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Paywall'> & {
  answers: SurveyAnswers;
};

const FALLBACK: Record<PlanId, {priceString: string; detail: string; trialLabel: string | null}> = {
  yearly: {
    priceString: '$39.99',
    detail: '$3.33/month · Cancel anytime',
    trialLabel: '7 DAYS FREE',
  },
  weekly: {
    priceString: '$9.99',
    detail: 'Full access · Cancel anytime',
    trialLabel: null,
  },
};

function yearlyDetail(product?: PlanProduct) {
  if (!product) return FALLBACK.yearly.detail;
  if (product.pricePerMonthString) {
    return `${product.pricePerMonthString}/month · Cancel anytime`;
  }
  return 'Cancel anytime';
}

export function PaywallScreen({navigation, route}: Props) {
  const dispatch = useAppDispatch();
  const selectedPlan = useAppSelector(s => s.purchases.selectedPlan);
  const plans = useAppSelector(s => s.purchases.plans);
  const flowStatus = useAppSelector(s => s.purchases.flowStatus);
  const isPremium = useAppSelector(s => s.purchases.isPremium);
  const inReview = useAppSelector(s => s.purchases.inReview);
  const busy = flowStatus !== 'idle';

  const yearly = useMemo(() => plans.find(p => p.plan === 'yearly'), [plans]);
  const weekly = useMemo(() => plans.find(p => p.plan === 'weekly'), [plans]);
  const selected = selectedPlan === 'yearly' ? yearly : weekly;

  const fromProfile = route.params?.source === 'profile';
  const closeOpacity = useRef(new Animated.Value(inReview ? 1 : 0)).current;
  const [closeVisible, setCloseVisible] = useState(inReview);

  useEffect(() => {
    if (inReview) {
      setCloseVisible(true);
      closeOpacity.setValue(1);
      log.info('Close button shown immediately (inReview)');
      return;
    }

    setCloseVisible(false);
    closeOpacity.setValue(0);
    log.info(`Close button delayed ${CLOSE_DELAY_MS}ms`);
    const timer = setTimeout(() => {
      setCloseVisible(true);
      Animated.timing(closeOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }).start();
      log.info('Close button revealed');
    }, CLOSE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [closeOpacity, inReview]);

  const finish = () => {
    if (!fromProfile) {
      markOnboardingComplete().catch(() => undefined);
    }
    goHomeFaded(navigation);
  };

  const onClose = () => {
    log.info('Close pressed', {fromProfile, inReview});
    if (fromProfile) {
      navigation.goBack();
      return;
    }
    finish();
  };

  const onPurchase = async () => {
    log.info('CTA pressed', {
      selectedPlan,
      isPremium,
      productId: selected?.productId,
      packageIdentifier: selected?.packageIdentifier,
      planCount: plans.length,
    });
    if (isPremium) {
      log.info('Already premium — finishing');
      finish();
      return;
    }
    if (!selected) {
      log.warn('No RC package for selected plan');
      Alert.alert(
        'Products unavailable',
        'Subscription options could not be loaded. You can continue and try again later.',
        [
          {text: 'Try again', style: 'cancel'},
          {text: 'Continue', onPress: finish},
        ],
      );
      return;
    }

    const result = await dispatch(purchaseSelectedPlan(selected.packageIdentifier));
    if (purchaseSelectedPlan.fulfilled.match(result)) {
      if (result.payload.isPremium) {
        log.success('Purchase unlocked Pro');
        finish();
        return;
      }
      log.warn('Purchase succeeded but entitlement inactive');
      Alert.alert('Almost there', 'Purchase completed but Pro access is not active yet.');
      return;
    }

    const payload = result.payload as {cancelled?: boolean; message?: string} | undefined;
    if (payload?.cancelled) {
      log.warn('User cancelled purchase sheet');
      return;
    }
    log.error('Purchase UI failed', payload);
    Alert.alert('Purchase failed', payload?.message ?? 'Please try again.');
  };

  const onRestore = async () => {
    log.info('Restore pressed');
    const result = await dispatch(restorePurchases());
    if (restorePurchases.fulfilled.match(result)) {
      if (result.payload.isPremium) {
        log.success('Restore unlocked Pro');
        Alert.alert('Restored', 'Your Fluent Pro access has been restored.', [
          {text: 'OK', onPress: finish},
        ]);
        return;
      }
      log.warn('Restore found no active entitlement');
      Alert.alert('No purchases found', 'We could not find an active subscription for this Apple ID.');
      return;
    }
    log.error('Restore UI failed', result.payload);
    Alert.alert('Restore failed', (result.payload as string) ?? 'Please try again.');
  };

  const yearlyEyebrow = yearly?.trialLabel
    ? `YEARLY · ${yearly.trialLabel}`
    : yearly
      ? 'YEARLY'
      : `YEARLY · ${FALLBACK.yearly.trialLabel}`;

  return (
    <ScreenShell>
      <View style={styles.topBar}>
        <Animated.View
          style={[styles.closeWrap, {opacity: closeOpacity}]}
          pointerEvents={closeVisible ? 'auto' : 'none'}
        >
          <AppBarButton onPress={onClose} accessibilityLabel="Close">
            <Icon.Close />
          </AppBarButton>
        </Animated.View>
        {fromProfile ? <Text style={styles.topTitle}>Fluent Pro</Text> : <View style={styles.topSpacer} />}
        <View style={styles.topSpacer} />
      </View>

      <View style={styles.container}>
        <View>
          <Text style={styles.eyebrow}>YOUR PATH IS READY</Text>
          <Text style={styles.title}>
            Keep the{`\n`}signal on.
          </Text>
          <Text style={styles.body}>
            Your own vocabulary, rhythm and{`\n`}practice space.
          </Text>
        </View>

        <View style={styles.plans}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{selected: selectedPlan === 'yearly'}}
            disabled={busy}
            onPress={() => dispatch(setSelectedPlan('yearly'))}
            style={[styles.yearlyCard, selectedPlan === 'yearly' && styles.planSelected]}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planEyebrow}>{yearlyEyebrow}</Text>
              {selectedPlan === 'yearly' && <Icon.Check size={18} />}
            </View>
            <Text style={styles.yearlyPrice}>
              {yearly?.priceString ?? FALLBACK.yearly.priceString}
            </Text>
            <Text style={styles.planDetail}>{yearlyDetail(yearly)}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="radio"
            accessibilityState={{selected: selectedPlan === 'weekly'}}
            disabled={busy}
            onPress={() => dispatch(setSelectedPlan('weekly'))}
            style={[styles.weeklyCard, selectedPlan === 'weekly' && styles.planSelected]}
          >
            <View>
              <Text style={styles.weeklyTitle}>Weekly</Text>
              <Text style={styles.weeklyDetail}>Full access · Cancel anytime</Text>
            </View>
            <View style={styles.weeklyPriceWrap}>
              <Text style={styles.weeklyPrice}>
                {weekly?.priceString ?? FALLBACK.weekly.priceString}
              </Text>
              <Text style={styles.weeklyUnit}> / week</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[styles.cta, busy && styles.ctaDisabled]}
            disabled={busy}
            onPress={onPurchase}
          >
            {busy && flowStatus === 'purchasing' ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={styles.ctaText}>
                {selectedPlan === 'yearly'
                  ? (yearly?.hasFreeTrial ?? !yearly)
                    ? 'Start free trial'
                    : 'Continue with yearly'
                  : 'Continue with weekly'}
              </Text>
            )}
          </Pressable>
          <Text style={styles.reassurance}>
            {selectedPlan === 'yearly' && (yearly?.hasFreeTrial ?? !yearly)
              ? 'No payment now · Cancel anytime'
              : 'Cancel anytime'}
          </Text>
          <View style={styles.links}>
            <Text style={styles.link} onPress={busy ? undefined : onRestore}>
              {flowStatus === 'restoring' ? 'Restoring…' : 'Restore'}
            </Text>
            <Text style={styles.dot}>·</Text>
            <Text
              style={styles.link}
              onPress={() => navigation.navigate('Legal', {doc: 'terms'})}
            >
              Terms
            </Text>
          </View>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  topBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeWrap: {
    width: 48,
    alignItems: 'flex-start',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  topSpacer: {width: 48},
  container: {
    flex: 1,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 2.4,
    color: colors.muted,
    fontWeight: '700',
  },
  title: {
    fontFamily: 'Georgia',
    fontSize: 55,
    lineHeight: 52,
    letterSpacing: -3,
    color: colors.text,
    marginTop: spacing.md,
  },
  body: {
    fontSize: 20,
    lineHeight: 29,
    color: colors.muted,
    marginTop: spacing.md,
  },
  plans: {gap: 11, marginTop: spacing.xl},
  yearlyCard: {
    padding: spacing.lg,
    minHeight: 190,
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  planSelected: {borderColor: 'rgba(200,255,251,.44)'},
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planEyebrow: {
    fontSize: 12,
    letterSpacing: 2.2,
    color: colors.muted,
    fontWeight: '700',
  },
  yearlyPrice: {
    fontFamily: 'Georgia',
    fontSize: 62,
    letterSpacing: -3,
    lineHeight: 68,
    color: colors.text,
    marginTop: 5,
  },
  planDetail: {fontSize: 16, color: colors.muted, marginTop: -2},
  weeklyCard: {
    minHeight: 82,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weeklyTitle: {fontSize: 18, fontWeight: '700', color: colors.text},
  weeklyDetail: {fontSize: 13, color: colors.muted, marginTop: 3},
  weeklyPriceWrap: {flexDirection: 'row', alignItems: 'baseline'},
  weeklyPrice: {fontFamily: 'Georgia', fontSize: 29, color: colors.text},
  weeklyUnit: {fontSize: 13, color: colors.muted},
  footer: {gap: spacing.sm},
  cta: {
    minHeight: 64,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
  },
  ctaDisabled: {opacity: 0.7},
  ctaText: {fontSize: 18, fontWeight: '700', color: colors.primaryText},
  reassurance: {fontSize: 13, textAlign: 'center', color: colors.muted},
  links: {flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 2},
  link: {fontSize: 14, color: colors.muted},
  dot: {color: colors.muted},
});

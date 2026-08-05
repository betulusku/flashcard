import React, {useEffect, useMemo, useRef, useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  AccessibilityInfo,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {Defs, G, LinearGradient, Path, Stop} from 'react-native-svg';

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
import type {SurveyAnswers} from '../../types/onboarding';
import {logEvent} from '../../services/mixpanel';
import {colors, radius, spacing} from '../../theme';
import {createLogger} from '../../utils/logger';
import {ScreenShell} from './ScreenShell';
import {PrimaryButtonBackground} from './OnboardingPrimitives';

const log = createLogger('Paywall');
const CLOSE_DELAY_MS = 5000;

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Paywall' | 'OnboardingPaywall'> & {
  answers: SurveyAnswers;
};

export function PaywallScreen({navigation, route}: Props) {
  const dispatch = useAppDispatch();
  const selectedPlan = useAppSelector(s => s.purchases.selectedPlan);
  const plans = useAppSelector(s => s.purchases.plans);
  const flowStatus = useAppSelector(s => s.purchases.flowStatus);
  const isPremium = useAppSelector(s => s.purchases.isPremium);
  const inReview = useAppSelector(s => s.purchases.inReview);
  const busy = flowStatus !== 'idle';

  const yearly = useMemo(() => plans.find(p => p.plan === 'yearly'), [plans]);
  const isOnboardingPaywall = route.name === 'OnboardingPaywall';
  const activePlan = isOnboardingPaywall ? 'weekly' : selectedPlan;
  const selected = plans.find(p => p.plan === activePlan);

  const fromProfile = route.params?.source === 'profile';
  const location = fromProfile ? 'profile' : route.params?.source === 'gate' ? 'splash' : 'onboarding';
  const type = isOnboardingPaywall ? 'onboarding' : 'common';
  const closeOpacity = useRef(new Animated.Value(inReview ? 1 : 0)).current;
  const [closeVisible, setCloseVisible] = useState(inReview);
  const ctaScale = useRef(new Animated.Value(1)).current;
  const [infoVisible, setInfoVisible] = useState(false);

  useEffect(() => {
    dispatch(setSelectedPlan('weekly'));
  }, [dispatch, isOnboardingPaywall]);

  useEffect(() => {
    void logEvent('paywall_view', {type, location});
  }, []);

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

  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotion => {
        if (reduceMotion) return;
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(ctaScale, {
              toValue: 1.025,
              duration: 900,
              useNativeDriver: true,
            }),
            Animated.timing(ctaScale, {
              toValue: 0.985,
              duration: 900,
              useNativeDriver: true,
            }),
          ]),
        );
        animation.start();
      })
      .catch(() => undefined);
    return () => animation?.stop();
  }, [ctaScale]);

  const finish = () => {
    if (!fromProfile) {
      markOnboardingComplete().catch(() => undefined);
    }
    goHomeFaded(navigation);
  };

  const onClose = () => {
    log.info('Close pressed', {fromProfile, inReview});
    void logEvent('paywall_close_click', {location, in_review: inReview});
    if (fromProfile) {
      navigation.goBack();
      return;
    }
    finish();
  };

  const onPurchase = async () => {
    void logEvent('paywall_purchase_click', {
      plan: activePlan,
      product_id: selected?.productId ?? null,
      package_identifier: selected?.packageIdentifier ?? null,
      location,
      already_premium: isPremium,
    });
    log.info('CTA pressed', {
      selectedPlan: activePlan,
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
        void logEvent('paywall_purchase_success', {
          plan: activePlan,
          product_id: selected.productId ?? null,
          location,
        });
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
      void logEvent('paywall_purchase_cancel', {plan: activePlan, location});
      return;
    }
    log.error('Purchase UI failed', payload);
    void logEvent('paywall_purchase_fail', {
      error_message: payload?.message ?? 'unknown',
      plan: activePlan,
      location,
    });
    Alert.alert('Purchase failed', payload?.message ?? 'Please try again.');
  };

  const onRestore = async () => {
    void logEvent('paywall_restore_click', {location});
    log.info('Restore pressed');
    const result = await dispatch(restorePurchases());
    if (restorePurchases.fulfilled.match(result)) {
      if (result.payload.isPremium) {
        log.success('Restore unlocked Pro');
        void logEvent('paywall_restore_result', {result: 'success', location});
        Alert.alert('Restored', 'Your FlashVocab Pro access has been restored.', [
          {text: 'OK', onPress: finish},
        ]);
        return;
      }
      log.warn('Restore found no active entitlement');
      void logEvent('paywall_restore_result', {result: 'no_entitlement', location});
      Alert.alert('No purchases found', 'We could not find an active subscription for this Apple ID.');
      return;
    }
    log.error('Restore UI failed', result.payload);
    void logEvent('paywall_restore_result', {result: 'error', location});
    Alert.alert('Restore failed', (result.payload as string) ?? 'Please try again.');
  };

  return (
    <ScreenShell padded={false}>
      {!isOnboardingPaywall && <Image source={require('../../../assets/common-paywall-bg.png')} style={styles.commonBackground} resizeMode="cover" accessibilityElementsHidden />}
      {isOnboardingPaywall && <Image source={require('../../../assets/onboarding-paywall-composite.png')} style={styles.onboardingBackground} resizeMode="cover" accessibilityElementsHidden />}
      <View style={[styles.container, isOnboardingPaywall ? styles.onboardingContainer : styles.commonContainer]}>
        <View style={styles.topBar}>
          <Animated.View style={{opacity: closeOpacity}} pointerEvents={closeVisible ? 'auto' : 'none'}>
            <AppBarButton onPress={onClose} accessibilityLabel="Close"><Icon.Close color={colors.muted} /></AppBarButton>
          </Animated.View>
          <AppBarButton onPress={() => { void logEvent('paywall_help_click'); setInfoVisible(true); }} accessibilityLabel="Subscription information"><InfoIcon /></AppBarButton>
        </View>

        {isOnboardingPaywall ? (
          <>
            <View style={styles.onboardingHero}>
              <View style={styles.onboardingHeroCopy}>
                <Text style={styles.onboardingTitle}>Unlock{`\n`}<Text style={styles.titleAccent}>Premium</Text></Text>
                <Text style={styles.onboardingBody}>Unlock your full vocabulary potential.</Text>
              </View>
            </View>
          </>
        ) : null}

        {isOnboardingPaywall ? (
          <>
            <View style={styles.featureRows}>
              <FeatureRow icon="book" title="Unlimited vocabulary & lessons" detail="All words, examples and lessons" />
              <FeatureRow icon="brain" title="AI-powered practice" detail="Smarter reviews that adapt to you" />
              <FeatureRow icon="chart" title="Track your progress" detail="Detailed stats and weekly goals" />
              <FeatureRow icon="cloud" title="Learn anywhere" detail="Offline access on all devices" />
            </View>
            <View style={[styles.footer, styles.onboardingFooter]}>
              <Text style={styles.onboardingPrice}>Start 1-week trial, then $9,99/week. Cancel anytime.</Text>
              <Animated.View style={[styles.ctaWrap, {transform: [{scale: ctaScale}]}]}>
                <Pressable style={[styles.cta, busy && styles.ctaDisabled]} disabled={busy} onPress={onPurchase}>
                  <PrimaryButtonBackground />
                  {busy && flowStatus === 'purchasing' ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.ctaText}>Start 7-Day Trial</Text>}
                </Pressable>
              </Animated.View>
            </View>
          </>
        ) : (
          <View style={styles.commonStack}>
            <View style={styles.commonTop}>
              <View style={styles.hero}>
                <Text style={styles.title}>Unlock{`\n`}<Text style={styles.titleAccent}>Premium</Text></Text>
                <Text style={styles.body}>Unlock your full vocabulary potential.</Text>
              </View>
              <LaurelSocialProof />
            </View>
            <View style={styles.commonFeatures}>
              <CommonFeatureRow icon="book" title="Unlimited vocabulary & lessons" detail="All words, examples and grammar" />
              <CommonFeatureRow icon="brain" title="AI-powered practice" detail="Smarter reviews that adapt to you" />
              <CommonFeatureRow icon="chart" title="Track your progress" detail="Detailed stats and weekly goals" />
              <CommonFeatureRow icon="cloud" title="Learn anywhere" detail="Offline access on all devices" />
            </View>
            <View style={styles.planOptions}>
              <Pressable style={[styles.planOption, activePlan === 'weekly' && styles.planOptionSelected]} onPress={() => { void logEvent('paywall_plan_click', {plan: 'weekly', price_string: plans.find(p => p.plan === 'weekly')?.priceString ?? null}); dispatch(setSelectedPlan('weekly')); }}>
                <View><Text style={[styles.planTitle, activePlan === 'weekly' && styles.planTitleSelected]}>1-WEEK TRIAL</Text><Text style={styles.planDetail}>Try all Premium features</Text></View>
                <View style={styles.planPriceWrap}><Text style={styles.planPrice}>Then $9.99{`\n`}per week</Text><View style={[styles.radio, activePlan === 'weekly' && styles.radioSelected]}>{activePlan === 'weekly' && <Icon.Check size={18} color={colors.primaryText} />}</View></View>
              </Pressable>
              <Pressable style={[styles.planOption, activePlan === 'yearly' && styles.planOptionSelected]} onPress={() => { void logEvent('paywall_plan_click', {plan: 'yearly', price_string: yearly?.priceString ?? null}); dispatch(setSelectedPlan('yearly')); }}>
                <View><View style={styles.planTitleRow}><Text style={[styles.planTitle, activePlan === 'yearly' && styles.planTitleSelected]}>YEARLY ACCESS</Text><Text style={styles.bestValue}>BEST VALUE</Text></View><Text style={styles.planDetail}>{yearly?.priceString ?? '$39.99'} per year</Text></View>
                <View style={styles.planPriceWrap}><Text style={styles.planPrice}>$0.77{`\n`}per week</Text><View style={[styles.radio, activePlan === 'yearly' && styles.radioSelected]}>{activePlan === 'yearly' && <Icon.Check size={18} color={colors.primaryText} />}</View></View>
              </Pressable>
            </View>
            <View style={styles.commonFooter}>
              <Animated.View style={[styles.ctaWrap, styles.commonCtaWrap, {transform: [{scale: ctaScale}]}]}>
                <Pressable style={[styles.cta, busy && styles.ctaDisabled]} disabled={busy} onPress={onPurchase}>
                  <PrimaryButtonBackground />
                  {busy && flowStatus === 'purchasing' ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.ctaText}>Start 7-Day Trial</Text>}
                </Pressable>
              </Animated.View>
              <Text style={styles.cancelLine}>You can cancel anytime. No commitment.</Text>
            </View>
          </View>
        )}
      </View>
      <Modal visible={infoVisible} transparent animationType="fade" onRequestClose={() => setInfoVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setInfoVisible(false)}>
          <Pressable style={styles.infoPanel} onPress={() => undefined}>
            <View style={styles.infoPanelHeader}><Text style={styles.infoPanelTitle}>Subscription information</Text><Pressable onPress={() => setInfoVisible(false)} hitSlop={12}><Icon.Close color={colors.text} /></Pressable></View>
            <Pressable style={styles.infoAction} disabled={busy} onPress={() => { setInfoVisible(false); onRestore(); }}><Text style={styles.infoActionText}>{flowStatus === 'restoring' ? 'Restoring…' : 'Restore Purchases'}</Text></Pressable>
            <Pressable style={styles.infoAction} onPress={() => { void logEvent('paywall_legal_click', {doc: 'terms'}); setInfoVisible(false); navigation.navigate('Legal', {doc: 'terms'}); }}><Text style={styles.infoActionText}>Terms of Use</Text></Pressable>
            <Pressable style={styles.infoAction} onPress={() => { void logEvent('paywall_legal_click', {doc: 'privacy'}); setInfoVisible(false); navigation.navigate('Legal', {doc: 'privacy'}); }}><Text style={styles.infoActionText}>Privacy Policy</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenShell>
  );
}

function InfoIcon() {
  return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke={colors.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 16V12" stroke={colors.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 8H12.01" stroke={colors.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}

function LaurelSocialProof() {
  return (
    <View style={styles.ratingCard} accessible accessibilityLabel="Five stars. More than two million happy learners">
      <LaurelSide />
      <View style={styles.ratingCenter}>
        <Text style={styles.ratingStars}>★★★★★</Text>
        <Text style={styles.ratingText}>
          <Text style={styles.ratingStrong}>2M+</Text> happy learners
        </Text>
      </View>
      <LaurelSide flip />
    </View>
  );
}

function LaurelSide({flip}: {flip?: boolean}) {
  return (
    <Svg width={36} height={52} viewBox="0 0 80 120" style={flip ? styles.laurelFlip : undefined}>
      <Defs>
        <LinearGradient id={flip ? 'laurelMintR' : 'laurelMintL'} x1="0" y1="20" x2="0" y2="105">
          <Stop stopColor="#C8FFFB" />
          <Stop offset="1" stopColor="#6EDDD4" />
        </LinearGradient>
      </Defs>
      <G fill={`url(#${flip ? 'laurelMintR' : 'laurelMintL'})`} stroke={`url(#${flip ? 'laurelMintR' : 'laurelMintL'})`} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M68 104C39 90 27 61 31 26" strokeWidth="4" fill="none" />
        <Path d="M32 35C21 30 18 22 20 14C29 17 34 24 32 35Z" stroke="none" />
        <Path d="M34 50C23 48 17 41 17 33C27 34 34 41 34 50Z" stroke="none" />
        <Path d="M38 65C27 64 20 58 19 49C29 50 37 56 38 65Z" stroke="none" />
        <Path d="M44 79C33 80 25 75 22 67C33 66 41 71 44 79Z" stroke="none" />
        <Path d="M53 91C42 94 33 90 29 82C39 80 48 84 53 91Z" stroke="none" />
        <Path d="M64 101C53 106 44 103 38 96C48 92 58 95 64 101Z" stroke="none" />
        <Path d="M31 37C40 31 42 23 39 16C31 20 27 28 31 37Z" stroke="none" />
        <Path d="M34 53C44 48 47 40 45 32C36 36 31 44 34 53Z" stroke="none" />
        <Path d="M39 68C49 64 53 56 51 48C42 51 36 59 39 68Z" stroke="none" />
        <Path d="M46 82C56 79 61 72 60 64C50 66 44 73 46 82Z" stroke="none" />
        <Path d="M56 94C66 92 72 86 72 78C62 79 55 86 56 94Z" stroke="none" />
      </G>
    </Svg>
  );
}

function CommonFeatureRow({icon, title, detail}: {icon: 'book' | 'brain' | 'chart' | 'cloud'; title: string; detail: string}) {
  const FeatureIcon = icon === 'book' ? Icon.BookOpen : icon === 'brain' ? Icon.Award : icon === 'chart' ? Icon.BarChart : Icon.CloudRain;
  return <View style={styles.commonFeatureRow} accessible accessibilityLabel={`${title}. ${detail}`}>
    <View style={styles.commonFeatureIcon}><FeatureIcon size={22} color={colors.mint} strokeWidth={2} /></View>
    <View style={styles.featureCopy}><Text style={styles.commonFeatureTitle}>{title}</Text><Text style={styles.commonFeatureDetail}>{detail}</Text></View>
  </View>;
}

function FeatureRow({icon, title, detail}: {icon: 'book' | 'brain' | 'chart' | 'cloud'; title: string; detail: string}) {
  const FeatureIcon = icon === 'book' ? Icon.BookOpen : icon === 'brain' ? Icon.Award : icon === 'chart' ? Icon.BarChart : Icon.CloudRain;
  return <View style={styles.featureRow} accessible accessibilityLabel={`${title}. ${detail}`}>
    <View style={styles.featureIcon}><FeatureIcon size={22} color={colors.mint} strokeWidth={2} /></View>
    <View style={styles.featureCopy}><Text style={styles.featureTitle}>{title}</Text><Text style={styles.featureDetail}>{detail}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  container: {flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm},
  onboardingContainer: {paddingTop: spacing.md, paddingBottom: spacing.md},
  commonContainer: {flex: 1, paddingTop: 16, paddingBottom: 10},
  // Tall phones: spread blocks so gaps sit between sections, not as dead space under CTA.
  commonStack: {flex: 1, justifyContent: 'space-between', paddingBottom: 8},
  commonTop: {gap: 12},
  onboardingBackground: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: 'auto', height: 'auto'},
  commonBackground: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: 'auto', height: 'auto'},
  topBar: {minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  hero: {marginTop: 4},
  title: {fontSize: 42, lineHeight: 45, fontWeight: '700', letterSpacing: -1.4, color: colors.text},
  onboardingHero: {minHeight: 235, marginTop: spacing.md, flexDirection: 'row', alignItems: 'flex-start'},
  onboardingHeroCopy: {width: 280, paddingTop: spacing.sm, zIndex: 1},
  onboardingTitle: {fontFamily: 'Georgia', fontSize: 42, lineHeight: 44, letterSpacing: -1.7, color: colors.text},
  titleAccent: {color: colors.mint},
  body: {fontSize: 17, lineHeight: 23, color: colors.muted, marginTop: spacing.sm, maxWidth: 300},
  onboardingBody: {fontSize: 18, lineHeight: 25, maxWidth: 210, color: colors.muted, marginTop: spacing.sm},
  ratingCard: {
    alignSelf: 'flex-start',
    minHeight: 64,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(200,255,251,.28)',
    backgroundColor: 'rgba(6,18,28,.72)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  laurelFlip: {transform: [{scaleX: -1}]},
  ratingCenter: {alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 4},
  ratingStars: {fontSize: 15, lineHeight: 18, letterSpacing: 3.2, color: colors.mint},
  ratingText: {fontSize: 13, lineHeight: 16, color: colors.text},
  ratingStrong: {fontWeight: '800', color: colors.text},
  commonFeatures: {borderRadius: radius.md, overflow: 'hidden', backgroundColor: 'rgba(12,26,39,.68)'},
  commonFeatureRow: {minHeight: 54, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,.055)'},
  commonFeatureIcon: {width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(66,224,216,.075)'},
  commonFeatureTitle: {fontSize: 15, lineHeight: 19, fontWeight: '700', color: colors.text}, commonFeatureDetail: {fontSize: 13, lineHeight: 17, color: colors.muted, marginTop: 2},
  planOptions: {gap: 10},
  planOption: {minHeight: 68, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(12,26,39,.88)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  planOptionSelected: {borderWidth: 2, borderColor: colors.mint}, planTitle: {fontSize: 15, fontWeight: '800', letterSpacing: .5, color: colors.text}, planTitleSelected: {color: colors.mint}, planDetail: {fontSize: 13, color: colors.muted, marginTop: 4},
  planTitleRow: {flexDirection: 'row', alignItems: 'center', gap: 7}, bestValue: {fontSize: 10, fontWeight: '800', color: colors.primaryText, backgroundColor: colors.mint, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8},
  planPriceWrap: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm}, planPrice: {fontSize: 13, lineHeight: 17, textAlign: 'right', color: colors.muted}, radio: {width: 27, height: 27, borderRadius: 14, borderWidth: 2, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center'}, radioSelected: {borderColor: colors.mint, backgroundColor: colors.mint},
  featureRows: {gap: 8, marginTop: 14},
  featureRow: {minHeight: 72, borderRadius: radius.sm, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111824'},
  featureIcon: {width: 48, height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(200,255,251,.09)'},
  featureCopy: {flex: 1, marginLeft: spacing.sm},
  featureTitle: {fontSize: 17, lineHeight: 22, fontWeight: '700', color: colors.text},
  featureDetail: {fontSize: 14, lineHeight: 19, color: colors.muted, marginTop: 3},
  footer: {marginTop: 'auto', alignItems: 'stretch'},
  onboardingFooter: {marginTop: 'auto'},
  commonFooter: {alignItems: 'stretch', gap: 10, paddingBottom: 4},
  onboardingPrice: {fontSize: 16, lineHeight: 22, textAlign: 'center', color: colors.text, marginBottom: spacing.md},
  ctaWrap: {marginTop: spacing.sm, marginBottom: 56},
  commonCtaWrap: {marginTop: 0, marginBottom: 0},
  cta: {minHeight: 58, borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center'},
  ctaDisabled: {opacity: 0.7},
  ctaText: {fontSize: 20, fontWeight: '700', color: colors.primaryText},
  cancelLine: {fontSize: 13, textAlign: 'center', color: colors.muted, marginTop: 0},
  modalBackdrop: {flex: 1, justifyContent: 'flex-end', padding: spacing.md, backgroundColor: 'rgba(0,0,0,.68)'},
  infoPanel: {padding: spacing.lg, paddingBottom: spacing.xl, borderRadius: radius.lg, backgroundColor: '#111824', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border},
  infoPanelHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md},
  infoPanelTitle: {fontSize: 20, fontWeight: '700', color: colors.text},
  infoAction: {minHeight: 56, justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border},
  infoActionText: {fontSize: 17, fontWeight: '600', color: colors.mint},
});

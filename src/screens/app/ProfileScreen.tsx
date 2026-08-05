import React, {useCallback, useState} from 'react';
import type {CompositeScreenProps} from '@react-navigation/native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeBottomTabScreenProps} from '@react-navigation/bottom-tabs/unstable';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  Alert,
  Clipboard,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {launchImageLibrary} from 'react-native-image-picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import type {AppTabParamList} from '../../navigation/AppTabs';
import type {OnboardingStackParamList} from '../../navigation/OnboardingNavigator';
import {languageLabels, loadAppLanguage} from '../../logic/settings';
import {
  displayName,
  emptyProfile,
  loadProfile,
  saveProfile,
  type UserProfile,
} from '../../logic/profile';
import {loadSurvey} from '../../logic/survey';
import {loadUserId} from '../../logic/userId';
import {haptic} from '../../services/feedback';
import {logEvent} from '../../services/mixpanel';
import {Icon} from '../../components/Icon';
import {AppBar, AppBarButton} from '../../components/AppBar';
import {useAppDispatch} from '../../store/hooks';
import {restorePurchases} from '../../store/purchasesSlice';
import {colors, radius, spacing, tabBarSpace} from '../../theme';
import {createLogger} from '../../utils/logger';
import {ScreenShell} from '../onboarding/ScreenShell';
import {SettingsAction, SettingsGroup, SettingsRow} from './settings/SettingsChrome';

const log = createLogger('Profile');

type Props = CompositeScreenProps<
  NativeBottomTabScreenProps<AppTabParamList, 'ProfileTab'>,
  NativeStackScreenProps<OnboardingStackParamList>
>;

const levelLabels: Record<string, string> = {
  a1: 'A1 · Beginner',
  a2: 'A2 · Elementary',
  b1: 'B1 · Intermediate',
  b2: 'B2 · Upper-Int.',
  c1: 'C1 · Advanced',
  unsure: 'Finding your level',
};

export function ProfileScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [userId, setUserId] = useState('');
  const [language, setLanguage] = useState('English');
  const [level, setLevel] = useState('Your level');
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');

  const refresh = useCallback(() => {
    void logEvent('profile_view');
    loadProfile().then(setProfile).catch(() => undefined);
    loadUserId()
      .then(id => {
        log.debug('Profile loaded deviceId', {deviceId: id});
        setUserId(id);
      })
      .catch(error => {
        log.warn('loadUserId failed on profile', {
          message: error instanceof Error ? error.message : String(error),
        });
      });
    loadAppLanguage()
      .then(code => setLanguage(languageLabels[code]))
      .catch(() => undefined);
    loadSurvey()
      .then(answers => {
        setLevel(
          answers.level ? levelLabels[answers.level] ?? 'Your level' : 'Your level',
        );
      })
      .catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const open = (screen: keyof OnboardingStackParamList, params?: object) => {
    (navigation as any).navigate(screen, params);
  };

  const persist = async (next: UserProfile) => {
    const saved = await saveProfile(next);
    setProfile(saved);
    haptic('selection');
  };

  const closeNameEditor = () => {
    Keyboard.dismiss();
    setEditingName(false);
  };

  const openNameEditor = () => {
    setDraftName(profile.name);
    setEditingName(true);
  };

  const saveName = async () => {
    void logEvent('profile_name_click');
    Keyboard.dismiss();
    await persist({...profile, name: draftName});
    setEditingName(false);
  };

  const pickPhoto = () => {
    Alert.alert('Profile photo', undefined, [
      {
        text: 'Choose from library',
        onPress: () => {
          void logEvent('profile_photo_click', {action: 'choose'});
          launchImageLibrary(
            {mediaType: 'photo', quality: 0.8, selectionLimit: 1},
            async response => {
              if (response.didCancel || response.errorCode) return;
              const uri = response.assets?.[0]?.uri;
              if (!uri) return;
              await persist({...profile, photoUri: uri});
            },
          );
        },
      },
      profile.photoUri
        ? {
            text: 'Remove photo',
            style: 'destructive',
            onPress: () => {
              void logEvent('profile_photo_click', {action: 'remove'});
              persist({...profile, photoUri: null});
            },
          }
        : undefined,
      {text: 'Cancel', style: 'cancel'},
    ].filter(Boolean) as {text: string; style?: 'cancel' | 'destructive'; onPress?: () => void}[]);
  };

  const copyId = () => {
    if (!userId) return;
    void logEvent('profile_copyid_click');
    Clipboard.setString(userId);
    haptic('success');
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const onRestorePurchases = async () => {
    void logEvent('profile_restore_click');
    log.info('Restore pressed from profile');
    const result = await dispatch(restorePurchases());
    if (restorePurchases.fulfilled.match(result)) {
      if (result.payload.isPremium) {
        log.success('Profile restore unlocked Pro');
        Alert.alert('Restored', 'Your FlashVocab Pro access has been restored.');
        return;
      }
      log.warn('Profile restore found no entitlement');
      Alert.alert(
        'Nothing to restore',
        'No active FlashVocab purchase was found. If you think this is wrong, contact us with your User ID.',
      );
      return;
    }
    log.error('Profile restore failed', result.payload);
    Alert.alert('Restore failed', (result.payload as string) ?? 'Please try again.');
  };

  const rateUs = () => {
    void logEvent('rate_us_click');
    Alert.alert(
      'Rate FlashVocab',
      'Thanks for learning with us. Rating opens after App Store listing is live.',
    );
  };

  const shareApp = async () => {
    void logEvent('share_app_clicked');
    try {
      await Share.share({
        message:
          'I’m practising English with FlashVocab — short daily words that stick.',
      });
    } catch {
      // dismissed
    }
  };

  const name = displayName(profile);
  const shortId =
    userId.length > 22 ? `${userId.slice(0, 10)}…${userId.slice(-8)}` : userId;

  return (
    <ScreenShell>
      <AppBar
        title="Profile"
        right={
          <AppBarButton onPress={openNameEditor} accessibilityLabel="Edit name">
            <Icon.Edit2 />
          </AppBarButton>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.hero}>
          <Pressable
            onPress={pickPhoto}
            style={styles.avatarWrap}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
          >
            {profile.photoUri ? (
              <Image source={{uri: profile.photoUri}} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarEmpty}>
                <Icon.User size={40} color={colors.muted} strokeWidth={1.5} />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Icon.Camera size={14} color={colors.primaryText} />
            </View>
          </Pressable>

          <Pressable
            onPress={openNameEditor}
            accessibilityRole="button"
            hitSlop={8}
            style={styles.nameHit}
          >
            <Text style={[styles.heroName, !name && styles.heroNamePlaceholder]}>
              {name || 'Add your name'}
            </Text>
          </Pressable>
          <Text style={styles.heroMeta}>{level}</Text>
        </View>

        <Pressable
          style={styles.paywallCard}
          onPress={() => {
            open('TrialIntro', {source: 'profile'});
          }}
          accessibilityRole="button"
        >
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(200,255,251,.22)', 'rgba(42,75,203,.35)']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.paywallIcon}>
            <Icon.Award size={22} color={colors.primaryText} />
          </View>
          <View style={styles.paywallCopy}>
            <Text style={styles.paywallEyebrow}>FLASHVOCAB PRO</Text>
            <Text style={styles.paywallTitle}>Unlock your full path</Text>
            <Text style={styles.paywallSub}>
              Personal vocabulary, rhythm, and unlimited practice.
            </Text>
          </View>
          <Icon.ChevronRight size={18} color={colors.mint} />
        </Pressable>

        <SettingsGroup>
          <SettingsRow
            icon="Users"
            label="Preferences"
            onPress={() => {
              void logEvent('profile_settings_click', {item: 'preferences'});
              open('Preferences');
            }}
          />
          <SettingsRow
            icon="Globe"
            label="Language"
            value={language}
            onPress={() => {
              void logEvent('profile_settings_click', {item: 'language'});
              open('Language');
            }}
          />
          <SettingsRow
            icon="Mail"
            label="Contact Us"
            onPress={() => {
              void logEvent('profile_settings_click', {item: 'contact'});
              open('Contact');
            }}
          />
          <SettingsRow
            icon="Shield"
            label="Privacy Policy"
            onPress={() => {
              void logEvent('profile_settings_click', {item: 'privacy'});
              open('Legal', {doc: 'privacy'});
            }}
          />
          <SettingsRow
            icon="RefreshCw"
            label="Restore Purchase"
            onPress={onRestorePurchases}
          />
          <SettingsRow
            icon="FileText"
            label="Terms of Use"
            last
            onPress={() => {
              void logEvent('profile_settings_click', {item: 'terms'});
              open('Legal', {doc: 'terms'});
            }}
          />
        </SettingsGroup>

        <View style={styles.idCard}>
          <View style={styles.idIcon}>
            <Icon.User size={20} color={colors.mint} />
          </View>
          <View style={styles.idCopy}>
            <Text style={styles.idLabel}>User ID</Text>
            <Text style={styles.idValue} numberOfLines={1}>
              {shortId || '…'}
            </Text>
          </View>
          <Pressable
            onPress={copyId}
            style={styles.copyBtn}
            accessibilityLabel="Copy user id"
          >
            <Icon.Copy size={18} color={copied ? colors.mint : colors.text} />
          </Pressable>
        </View>

        <View style={styles.actions}>
          <SettingsAction icon="Star" label="Rate Us" accent onPress={rateUs} />
          <SettingsAction icon="Share2" label="Share App" onPress={shareApp} />
        </View>
      </ScrollView>

      <Modal
        visible={editingName}
        transparent
        animationType="slide"
        onRequestClose={closeNameEditor}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={styles.modalDismiss}
            onPress={closeNameEditor}
            accessibilityLabel="Dismiss"
          />
          <View
            style={[
              styles.modalCard,
              {paddingBottom: Math.max(insets.bottom, spacing.md)},
            ]}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Your name</Text>
            <Text style={styles.modalCopy}>
              How FlashVocab greets you on Home.
            </Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="First name"
              placeholderTextColor={colors.muted}
              autoFocus
              autoCorrect={false}
              autoCapitalize="words"
              textContentType="givenName"
              maxLength={32}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={saveName}
              style={styles.modalInput}
            />
            <Pressable style={styles.modalPrimary} onPress={saveName}>
              <Text style={styles.modalPrimaryText}>Save</Text>
            </Pressable>
            <Pressable onPress={closeNameEditor} hitSlop={8}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.md,
    paddingBottom: tabBarSpace + spacing.lg,
    paddingTop: spacing.sm,
  },
  // Matches the reference stack: large ringed avatar → airy name → tighter meta.
  hero: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  avatarWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    marginBottom: 18,
  },
  avatarImage: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1.5,
    borderColor: 'rgba(210,230,255,.42)',
  },
  avatarEmpty: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: 'rgba(210,230,255,.32)',
  },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
  },
  nameHit: {
    paddingHorizontal: 16,
  },
  heroName: {
    fontFamily: 'Georgia',
    fontSize: 24,
    lineHeight: 28,
    color: '#F8FCFF',
    textAlign: 'center',
  },
  heroNamePlaceholder: {
    fontSize: 20,
    lineHeight: 26,
    fontStyle: 'italic',
    color: 'rgba(184,200,229,.78)',
  },
  heroMeta: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 18,
    color: 'rgba(184,200,229,.72)',
    textAlign: 'center',
  },
  paywallCard: {
    minHeight: 92,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  paywallIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
  },
  paywallCopy: {flex: 1, gap: 2},
  paywallEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: colors.mint,
  },
  paywallTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  paywallSub: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  idCard: {
    minHeight: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  idIcon: {width: 28, alignItems: 'center'},
  idCopy: {flex: 1, gap: 2},
  idLabel: {fontSize: 13, fontWeight: '600', color: colors.text},
  idValue: {fontSize: 13, color: colors.muted},
  copyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceStrong,
  },
  actions: {flexDirection: 'row', gap: spacing.sm},
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,.55)',
  },
  modalDismiss: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  modalCard: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.backgroundRaised,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(242,248,255,.22)',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.text,
  },
  modalCopy: {color: colors.muted, fontSize: 14, lineHeight: 20},
  modalInput: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 17,
  },
  modalPrimary: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
  },
  modalPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryText,
  },
  modalCancel: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: spacing.sm,
  },
});

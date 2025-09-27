import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable, ActivityIndicator } from 'react-native';
import InterestSelector from '../../components/ui/InterestSelector';
import { InterestKey } from '../../constants/interests';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../styles/theme';
import { useLogger } from '../../utils/logger';
import DebugOverlay from '../../components/dev/DebugOverlay';

export default function InterestOnboarding({ navigation }: any) {
  const logger = useLogger('InterestOnboarding');
  const { user } = useAuth();
  const { preferences, updateInterests, loading } = usePreferences();
  const [selected, setSelected] = useState<InterestKey[]>([]);
  const [saving, setSaving] = useState(false);

  logger.info('component render', {
    userExists: !!user,
    userId: user?.uid,
    preferencesLoading: loading,
    currentInterests: preferences.interests,
    selectedCount: selected.length,
    selected,
    saving
  });

  useEffect(() => {
    // Cargar intereses existentes del usuario
    logger.debug('useEffect preferences.interests', {
      preferencesInterests: preferences.interests,
      currentSelected: selected
    });

    if (preferences.interests) {
      const interestsArray = preferences.interests as InterestKey[];
      logger.info('loading existing interests', {
        fromPreferences: interestsArray,
        settingSelected: true
      });
      setSelected(interestsArray);
    }
  }, [preferences.interests]);

  const handleInterestChange = (interests: InterestKey[]) => {
    logger.info('handleInterestChange', {
      oldSelected: selected,
      newInterests: interests,
      changeType: interests.length > selected.length ? 'added' : 'removed'
    });

    setSelected(interests);

    logger.info('setSelected called', {
      newSelected: interests
    });
  };

  const onContinue = async () => {
    logger.info('onContinue started', {
      userExists: !!user,
      selectedCount: selected.length,
      selected,
      minimumRequired: 3
    });

    if (!user) {
      logger.warn('onContinue aborted - no user', { user });
      return;
    }
    if (selected.length < 3) {
      logger.warn('onContinue aborted - insufficient interests', {
        selectedCount: selected.length,
        required: 3
      });
      return;
    }

    try {
      logger.info('starting save process', { selected });
      setSaving(true);

      logger.info('calling updateInterests', { selected });
      await updateInterests(selected);
      logger.info('updateInterests completed successfully');

      // Navegar al stack principal
      logger.info('navigating to MainTabs');
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      logger.info('navigation completed');
    } catch (error) {
      logger.error('Error saving interests', error, { selected });
    } finally {
      setSaving(false);
      logger.info('saving state reset to false');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Cargando tus preferencias...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>¿Qué te interesa?</Text>
        <Text style={styles.subtitle}>
          Elige al menos 3 para personalizar tus itinerarios • Seleccionados: {selected.length}
        </Text>
      </View>

      <InterestSelector
        selected={selected}
        onChange={handleInterestChange}
        testID="onboarding-interest-selector"
      />

      <View style={styles.footer}>
        <Pressable
          onPress={onContinue}
          disabled={saving || selected.length < 3}
          style={[
            styles.btn,
            (saving || selected.length < 3) && styles.btnDisabled
          ]}
          testID="continue-button"
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Continuar</Text>
          )}
        </Pressable>
      </View>

      <DebugOverlay />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background.primary
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.secondary,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSizes['3xl'],
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.fontSizes.sm,
  },
  footer: {
    padding: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
    backgroundColor: theme.colors.surface.primary,
  },
  btn: {
    backgroundColor: theme.colors.primary.main,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  btnDisabled: {
    opacity: 0.6,
    backgroundColor: theme.colors.neutral[300],
  },
  btnText: {
    color: theme.colors.neutral.white,
    fontWeight: theme.typography.fontWeights.semiBold,
    fontSize: theme.typography.fontSizes.base,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ensureUserProfile } from '../../utils/profile';
import { serverTimestamp } from 'firebase/firestore';

// Firebase imports - SDK modular v9+
import {
  onAuthStateChanged,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  addDoc,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';

// Import Firebase services
import { auth, db } from '../../services/firebase';
import InterestSelector, { TOURIST_INTERESTS } from '../../components/ui/InterestSelector';
import { usePreferences } from '../../contexts/PreferencesContext';

// TypeScript interfaces
interface UserProfileDoc {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  location: string;
  language: string;
  timezone: string;
  interests: string[];
  createdAt?: Timestamp;
}

// Theme constants
const theme = {
  colors: {
    primary: '#2563EB',
    primaryLight: '#EFF6FF',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#1F2937',
    textSecondary: '#6B7280',
    textLight: '#9CA3AF',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
  },
  shadows: {
    sm: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
    md: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 3px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      },
    }),
  },
};

// Utility functions
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Subcomponents

interface ListItemAjusteProps {
  icon: string;
  title: string;
  onPress: () => void;
  showChevron?: boolean;
}

const ListItemAjuste: React.FC<ListItemAjusteProps> = ({
  icon,
  title,
  onPress,
  showChevron = true,
}) => {
  return (
    <Pressable
      style={styles.settingsItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.settingsItemLeft}>
        <MaterialCommunityIcons
          name={icon as any}
          size={20}
          color={theme.colors.textSecondary}
        />
        <Text style={styles.settingsItemText}>{title}</Text>
      </View>
      {showChevron && (
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={theme.colors.textLight}
        />
      )}
    </Pressable>
  );
};

// Main Profile Screen Component
const ProfileScreen: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfileDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editLocation, setEditLocation] = useState('');
  const [editLanguage, setEditLanguage] = useState('');
  const [editTimezone, setEditTimezone] = useState('');
  const [interestsModalVisible, setInterestsModalVisible] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Use centralized preferences system
  const { preferences, updateInterests } = usePreferences();

  // Sync selectedInterests with preferences.interests
  useEffect(() => {
    setSelectedInterests(preferences.interests);
  }, [preferences.interests]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        setupUserData(user);
      } else {
        setLoading(false);
      }
    });

    return unsubscribeAuth;
  }, []);

  const setupUserData = async (user: FirebaseUser) => {
  try {
    // 1) Normaliza/crea el perfil con defaults consistentes
    await ensureUserProfile({
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName,
      language: "es",
      location: "Santiago",
      timezone: "America/Santiago",
    });

    // 2) Ahora lee el documento ya normalizado
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    const profileData = userDoc.data() as any;
    setProfile(profileData);
    setEditLocation(profileData.location);
    setEditLanguage(profileData.language);
    setEditTimezone(profileData.timezone);
    setSelectedInterests(profileData.interests || []);

    setLoading(false);
  } catch (error) {
    console.error('Error setting up user data:', error);
    setLoading(false);
  }
};


  const handleEditProfile = async () => {
    if (!user || !profile) return;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        location: editLocation,
        language: editLanguage,
        timezone: editTimezone,
      });

      setProfile({
        ...profile,
        location: editLocation,
        language: editLanguage,
        timezone: editTimezone,
      });

      setEditModalVisible(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    }
  };

  const handleInterestToggle = (interestId: string) => {
    console.log('Toggling interest:', interestId);
    setSelectedInterests(prev => {
      const updated = prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId];
      console.log('Updated selectedInterests:', updated);
      return updated;
    });
  };

  const handleSaveInterests = async () => {
    try {
      console.log('Saving interests:', selectedInterests);
      await updateInterests(selectedInterests);
      console.log('Interests saved successfully');

      // Update local profile state
      if (profile) {
        setProfile({
          ...profile,
          interests: selectedInterests,
        });
      }

      setInterestsModalVisible(false);
      Alert.alert('Éxito', 'Tus intereses han sido actualizados correctamente');
    } catch (error) {
      console.error('Error updating interests:', error);
      Alert.alert('Error', 'No se pudieron actualizar los intereses');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'No se pudo cerrar sesión');
    }
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!user || !profile) {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Inicia sesión para ver tu perfil</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {profile.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {getInitials(profile.displayName)}
                </Text>
              </View>
            )}
            <View style={styles.headerInfo}>
              <Text style={styles.userName}>{profile.displayName}</Text>
              <Text style={styles.userEmail}>{profile.email}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.headerButton}
              onPress={() => setEditModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Editar perfil"
            >
              <MaterialCommunityIcons
                name="pencil"
                size={20}
                color={theme.colors.textSecondary}
              />
            </Pressable>
            <Pressable
              style={styles.headerButton}
              onPress={() => console.log('Settings')}
              accessibilityRole="button"
              accessibilityLabel="Configuración"
            >
              <MaterialCommunityIcons
                name="cog"
                size={20}
                color={theme.colors.textSecondary}
              />
            </Pressable>
          </View>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información básica</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons
                name="map-marker"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.infoText}>
                {profile.location || 'Santiago, Providencia'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons
                name="translate"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.infoText}>{profile.language}</Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons
                name="clock"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.infoText}>{profile.timezone}</Text>
            </View>
          </View>
        </View>

        {/* Tourist Interests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Intereses turísticos</Text>
          <View style={styles.interestsContainer}>
            {preferences.interests && preferences.interests.length > 0 ? (
              <View style={styles.interestsPreview}>
                <View style={styles.selectedInterestsGrid}>
                  {preferences.interests.slice(0, 6).map((interestId) => {
                    const interest = TOURIST_INTERESTS.find(i => i.id === interestId);
                    if (!interest) return null;

                    return (
                      <View key={interestId} style={styles.interestBadge}>
                        <MaterialCommunityIcons
                          name={interest.icon as any}
                          size={16}
                          color={theme.colors.primary.main}
                        />
                        <Text style={styles.interestBadgeText}>{interest.name}</Text>
                      </View>
                    );
                  })}
                  {preferences.interests.length > 6 && (
                    <View style={styles.interestBadge}>
                      <Text style={styles.interestBadgeText}>
                        +{preferences.interests.length - 6} más
                      </Text>
                    </View>
                  )}
                </View>
                <Pressable
                  style={styles.editInterestsButton}
                  onPress={() => setInterestsModalVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Editar intereses turísticos"
                >
                  <Text style={styles.editInterestsButtonText}>Editar intereses</Text>
                  <MaterialCommunityIcons
                    name="pencil"
                    size={16}
                    color={theme.colors.primary.main}
                  />
                </Pressable>
              </View>
            ) : (
              <View style={styles.noInterests}>
                <MaterialCommunityIcons
                  name="heart-plus-outline"
                  size={48}
                  color={theme.colors.text.tertiary}
                />
                <Text style={styles.noInterestsTitle}>
                  Aún no has seleccionado intereses
                </Text>
                <Text style={styles.noInterestsSubtitle}>
                  Personaliza tu experiencia turística seleccionando tus preferencias
                </Text>
                <Pressable
                  style={styles.selectInterestsButton}
                  onPress={() => setInterestsModalVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Seleccionar intereses turísticos"
                >
                  <Text style={styles.selectInterestsButtonText}>
                    Seleccionar intereses
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Privacy and Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacidad y cuenta</Text>
          <View style={styles.settingsList}>
            <ListItemAjuste
              icon="shield-check"
              title="Seguridad y privacidad"
              onPress={() => console.log('Security settings')}
            />
            <ListItemAjuste
              icon="translate"
              title="Idioma y accesibilidad"
              onPress={() => console.log('Language settings')}
            />
            <ListItemAjuste
              icon="help-circle"
              title="Ayuda y soporte"
              onPress={() => console.log('Help')}
            />
            <ListItemAjuste
              icon="logout"
              title="Cerrar sesión"
              onPress={handleSignOut}
              showChevron={false}
            />
          </View>
        </View>

      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar perfil</Text>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Ubicación</Text>
              <TextInput
                style={styles.modalInput}
                value={editLocation}
                onChangeText={setEditLocation}
                placeholder="Santiago, Providencia"
                placeholderTextColor={theme.colors.textLight}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Idioma</Text>
              <TextInput
                style={styles.modalInput}
                value={editLanguage}
                onChangeText={setEditLanguage}
                placeholder="Idioma preferido"
                placeholderTextColor={theme.colors.textLight}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Zona horaria</Text>
              <TextInput
                style={styles.modalInput}
                value={editTimezone}
                onChangeText={setEditTimezone}
                placeholder="America/Santiago"
                placeholderTextColor={theme.colors.textLight}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleEditProfile}
              >
                <Text style={styles.modalButtonTextPrimary}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Interests Selection Modal */}
      <Modal
        visible={interestsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInterestsModalVisible(false)}
      >
        <View style={styles.interestsModalOverlay}>
          <View style={[styles.interestsModalContent, Platform.OS === 'web' && styles.interestsModalContentWeb]}>
            <View style={styles.interestsModalHeader}>
              <Text style={styles.interestsModalTitle}>
                Selecciona tus intereses turísticos
              </Text>
              <Text style={styles.interestsModalSubtitle}>
                Elige las actividades que más te gustan para personalizar tus recomendaciones
              </Text>
              <Pressable
                style={styles.interestsModalClose}
                onPress={() => setInterestsModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={theme.colors.text.secondary}
                />
              </Pressable>
            </View>

            <View style={styles.interestsModalBody}>
              <InterestSelector
                selectedInterests={selectedInterests}
                onInterestToggle={handleInterestToggle}
                showCategories={true}
              />
            </View>

            <View style={styles.interestsModalFooter}>
              <View style={styles.interestsCounter}>
                <Text style={styles.interestsCounterText}>
                  {selectedInterests.length} {selectedInterests.length === 1 ? 'interés seleccionado' : 'intereses seleccionados'}
                </Text>
              </View>
              <View style={styles.interestsModalActions}>
                <Pressable
                  style={[styles.interestsModalButton, styles.interestsModalButtonSecondary]}
                  onPress={() => {
                    setSelectedInterests(preferences.interests);
                    setInterestsModalVisible(false);
                  }}
                >
                  <Text style={styles.interestsModalButtonTextSecondary}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[styles.interestsModalButton, styles.interestsModalButtonPrimary]}
                  onPress={handleSaveInterests}
                >
                  <Text style={styles.interestsModalButtonTextPrimary}>
                    Guardar intereses
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  loginText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.full,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  headerInfo: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  section: {
    marginBottom: theme.spacing.xxl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  subsection: {
    marginBottom: theme.spacing.xl,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  infoGrid: {
    paddingHorizontal: theme.spacing.lg,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  preferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.lg,
    marginHorizontal: -theme.spacing.xs,
  },
  preferenceCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    minHeight: 100,
    ...theme.shadows.sm,
  },
  preferenceCardSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  preferenceLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 16,
  },
  preferenceLabelSelected: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  preferenceCheck: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
  },
  horizontalList: {
    paddingLeft: theme.spacing.lg,
  },
  itineraryCard: {
    width: 120,
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    ...theme.shadows.sm,
  },
  itineraryImage: {
    height: 80,
    borderTopLeftRadius: theme.radius.md,
    borderTopRightRadius: theme.radius.md,
    overflow: 'hidden',
  },
  itineraryImageContent: {
    width: '100%',
    height: '100%',
  },
  itineraryImagePlaceholder: {
    backgroundColor: theme.colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itineraryCity: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    padding: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  itineraryDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  favoritesList: {
    paddingHorizontal: theme.spacing.lg,
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  favoriteInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  favoriteTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 2,
  },
  favoriteSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  favoritesDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginLeft: 44,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  settingsList: {
    paddingHorizontal: theme.spacing.lg,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsItemText: {
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
  },
  demoSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  demoButton: {
    backgroundColor: theme.colors.warning,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  demoButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.background,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xxl,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  modalField: {
    marginBottom: theme.spacing.lg,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xl,
  },
  modalButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.sm,
  },
  modalButtonPrimary: {
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.background,
  },
  // Tourist Interests styles
  interestsContainer: {
    paddingHorizontal: theme.spacing.lg,
  },
  interestsPreview: {
    backgroundColor: theme.colors.surface.primary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    ...theme.shadows.sm,
  },
  selectedInterestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
    marginHorizontal: -theme.spacing.xs,
  },
  interestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.radius.full,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    marginHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary.main,
  },
  interestBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary.main,
    marginLeft: theme.spacing.xs,
  },
  editInterestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary.main,
  },
  editInterestsButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary.main,
    marginRight: theme.spacing.xs,
  },
  noInterests: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.lg,
  },
  noInterestsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  noInterestsSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.xl,
  },
  selectInterestsButton: {
    backgroundColor: theme.colors.primary.main,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.md,
    ...theme.shadows.sm,
  },
  selectInterestsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.background.primary,
  },
  // Interests Modal styles
  interestsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    ...Platform.select({
      web: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
      },
    }),
  },
  interestsModalContent: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    marginTop: 50,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
  },
  interestsModalContentWeb: {
    flex: 0,
    maxWidth: 800,
    maxHeight: '90%',
    width: '100%',
    borderRadius: theme.radius.lg,
    marginTop: 0,
    ...theme.shadows.md,
  },
  interestsModalHeader: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
    position: 'relative',
  },
  interestsModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  interestsModalSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  interestsModalClose: {
    position: 'absolute',
    top: theme.spacing.lg,
    right: theme.spacing.lg,
    padding: theme.spacing.xs,
  },
  interestsModalBody: {
    flex: 1,
    paddingTop: theme.spacing.md,
  },
  interestsModalFooter: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
    backgroundColor: theme.colors.background.primary,
  },
  interestsCounter: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  interestsCounterText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  interestsModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  interestsModalButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  interestsModalButtonSecondary: {
    backgroundColor: theme.colors.surface.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    marginRight: theme.spacing.sm,
  },
  interestsModalButtonPrimary: {
    backgroundColor: theme.colors.primary.main,
    marginLeft: theme.spacing.sm,
  },
  interestsModalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  interestsModalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.background.primary,
  },
});

export default ProfileScreen;
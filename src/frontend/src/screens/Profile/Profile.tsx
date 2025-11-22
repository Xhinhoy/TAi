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
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Localization from 'expo-localization';

// Firebase imports - SDK modular v9+
import {
  onAuthStateChanged,
  signOut,
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
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
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [interestsModalVisible, setInterestsModalVisible] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Real-time device information
  const [currentLocation, setCurrentLocation] = useState<string>('Obteniendo ubicación...');
  const [deviceLanguage, setDeviceLanguage] = useState<string>('');
  const [deviceTimezone, setDeviceTimezone] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');

  // Use centralized preferences system
  const { preferences, updateInterests } = usePreferences();

  // Sync selectedInterests with preferences.interests
  useEffect(() => {
    setSelectedInterests(preferences.interests);
  }, [preferences.interests]);

  // Get device location on mount
  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setCurrentLocation('Ubicación no disponible');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const [address] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (address) {
          const locationString = [address.city, address.region, address.country]
            .filter(Boolean)
            .join(', ');
          setCurrentLocation(locationString || 'Ubicación desconocida');
        } else {
          setCurrentLocation(`${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`);
        }
      } catch (error) {
        console.error('Error getting location:', error);
        setCurrentLocation('Ubicación no disponible');
      }
    };

    getLocation();
  }, []);

  // Get device language and timezone
  useEffect(() => {
    const locale = Localization.getLocales()[0];
    setDeviceLanguage(locale.languageCode || 'es');
    setDeviceTimezone(Localization.timezone || 'America/Santiago');
  }, []);

  // Update current time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

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
      // Setup profile document
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      let profileData: UserProfileDoc;
      if (!userDoc.exists()) {
        // Create initial profile - only include photoURL if it exists
        profileData = {
          uid: user.uid,
          displayName: user.displayName || 'Usuario',
          email: user.email || '',
          location: 'Santiago, Providencia',
          language: 'es',
          timezone: 'America/Santiago',
          interests: [],
          createdAt: Timestamp.now(),
        };

        // Only add photoURL if it exists and is not null/undefined
        if (user.photoURL) {
          profileData.photoURL = user.photoURL;
        }

        await setDoc(userDocRef, profileData);
      } else {
        profileData = userDoc.data() as UserProfileDoc;
      }
      setProfile(profileData);
      setEditDisplayName(profileData.displayName);
      setEditEmail(profileData.email);
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
      let hasChanges = false;

      // Validar que si se cambia email o contraseña, se proporcione la contraseña actual
      const needsReauth = editEmail !== user.email || newPassword.trim() !== '';

      if (needsReauth && !currentPassword) {
        Alert.alert('Contraseña requerida', 'Debes ingresar tu contraseña actual para cambiar tu email o contraseña');
        return;
      }

      // Validar nueva contraseña si se proporciona
      if (newPassword.trim() !== '') {
        if (newPassword.length < 6) {
          Alert.alert('Contraseña inválida', 'La contraseña debe tener al menos 6 caracteres');
          return;
        }
        if (newPassword !== confirmPassword) {
          Alert.alert('Error', 'Las contraseñas no coinciden');
          return;
        }
      }

      // Reautenticar si es necesario
      if (needsReauth) {
        const credential = EmailAuthProvider.credential(user.email || '', currentPassword);
        await reauthenticateWithCredential(user, credential);
      }

      // Actualizar nombre de usuario
      if (editDisplayName !== user.displayName) {
        await updateProfile(user, { displayName: editDisplayName });
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { displayName: editDisplayName });
        setProfile({ ...profile, displayName: editDisplayName });
        hasChanges = true;
      }

      // Actualizar email (requiere verificación)
      if (editEmail !== user.email) {
        await updateEmail(user, editEmail);
        await sendEmailVerification(user);
        setEmailVerificationSent(true);
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { email: editEmail });
        setProfile({ ...profile, email: editEmail });
        hasChanges = true;
        Alert.alert(
          'Verificación de email enviada',
          `Se ha enviado un correo de verificación a ${editEmail}. Por favor verifica tu email para completar el cambio.`
        );
      }

      // Actualizar contraseña
      if (newPassword.trim() !== '') {
        await updatePassword(user, newPassword);
        hasChanges = true;
        Alert.alert('Éxito', 'Contraseña actualizada correctamente');
      }

      if (hasChanges) {
        // Limpiar campos de contraseña
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setEditModalVisible(false);
        if (!emailVerificationSent) {
          Alert.alert('Éxito', 'Perfil actualizado correctamente');
        }
      } else {
        setEditModalVisible(false);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      let errorMessage = 'No se pudo actualizar el perfil';

      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Contraseña actual incorrecta';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'El email ya está en uso por otra cuenta';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Por seguridad, debes cerrar sesión y volver a iniciarla para realizar este cambio';
      }

      Alert.alert('Error', errorMessage);
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
      console.log('🚪 Cerrando sesión...');
      await signOut(auth);
      console.log('✅ Sesión cerrada exitosamente');
    } catch (error) {
      console.error('❌ Error cerrando sesión:', error);
      if (Platform.OS === 'web') {
        alert('Error: No se pudo cerrar sesión');
      } else {
        Alert.alert('Error', 'No se pudo cerrar sesión');
      }
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
              onPress={() => {
                setEditDisplayName(profile?.displayName || '');
                setEditEmail(user?.email || '');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setEmailVerificationSent(false);
                setEditModalVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Editar perfil"
            >
              <MaterialCommunityIcons
                name="pencil"
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
              <Text style={styles.infoText}>{currentLocation}</Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons
                name="translate"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.infoText}>{deviceLanguage}</Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons
                name="clock"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.infoText}>{deviceTimezone}</Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.infoText}>{currentTime}</Text>
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
              icon="heart-outline"
              title="Editar intereses"
              onPress={() => setInterestsModalVisible(true)}
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
        onRequestClose={() => {
          setEditModalVisible(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar perfil</Text>
              <Pressable
                onPress={() => {
                  setEditModalVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                style={styles.closeModalButton}
              >
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Nombre de usuario */}
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Nombre de usuario</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editDisplayName}
                  onChangeText={setEditDisplayName}
                  placeholder="Ingresa tu nombre"
                  placeholderTextColor={theme.colors.textLight}
                />
              </View>

              {/* Email */}
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Email</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="tu@email.com"
                  placeholderTextColor={theme.colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {editEmail !== user?.email && (
                  <Text style={styles.fieldHint}>
                    Se enviará un correo de verificación al nuevo email
                  </Text>
                )}
              </View>

              {/* Separador */}
              <View style={styles.sectionSeparator}>
                <Text style={styles.sectionSeparatorText}>Cambiar contraseña (opcional)</Text>
              </View>

              {/* Contraseña actual */}
              {(editEmail !== user?.email || newPassword.trim() !== '') && (
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Contraseña actual *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Ingresa tu contraseña actual"
                    placeholderTextColor={theme.colors.textLight}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              )}

              {/* Nueva contraseña */}
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Nueva contraseña</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={theme.colors.textLight}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              {/* Confirmar contraseña */}
              {newPassword.trim() !== '' && (
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Confirmar nueva contraseña</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Repite la nueva contraseña"
                    placeholderTextColor={theme.colors.textLight}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setEditModalVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleEditProfile}
              >
                <Text style={styles.modalButtonTextPrimary}>Guardar cambios</Text>
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
          <View style={styles.interestsModalContent}>
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  closeModalButton: {
    padding: theme.spacing.xs,
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
  fieldHint: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  sectionSeparator: {
    marginVertical: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  sectionSeparatorText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
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
    ...Platform.select({
      web: {
        flex: 0,
        maxWidth: 800,
        maxHeight: '90%',
        width: '100%',
        borderRadius: theme.radius.lg,
        marginTop: 0,
        ...theme.shadows.md,
      },
      default: {
        flex: 1,
        marginTop: 60,
        borderTopLeftRadius: theme.radius.xl,
        borderTopRightRadius: theme.radius.xl,
        ...theme.shadows.lg,
      },
    }),
    backgroundColor: theme.colors.background.primary,
  },
  interestsModalContentWeb: {
    // Ya no es necesario, los estilos web están en interestsModalContent
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
  // Settings Modal styles
  settingsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  closeModalButton: {
    padding: theme.spacing.xs,
  },
});

export default ProfileScreen;
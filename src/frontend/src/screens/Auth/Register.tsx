import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput as RNTextInput,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormData } from "../../schemas/auth";
import { useAuth } from "../../hooks/useAuth";
import { Input, Button, Checkbox, PasswordStrengthBar } from "../../components/ui";
import { UserIcon, MailIcon, LockIcon, EyeIcon, EyeOffIcon } from "../../components/icons";
import { theme } from "../../styles/theme";

interface RegisterProps {
  navigation: any;
}

export default function Register({ navigation }: RegisterProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailRef = useRef<RNTextInput>(null);
  const passwordRef = useRef<RNTextInput>(null);
  const confirmPasswordRef = useRef<RNTextInput>(null);

  const { signUpWithEmail, loading } = useAuth();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isValid, dirtyFields },
    setFocus,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const watchedPassword = watch("password");
  const watchedAcceptTerms = watch("acceptTerms");

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await signUpWithEmail({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
      });
      // El error/éxito ya se maneja en useAuth con notificaciones
    } catch (error: any) {
      // El error ya se maneja en useAuth con notificaciones
    }
  };

  const focusNextField = (nextRef: React.RefObject<RNTextInput>) => {
    nextRef.current?.focus();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Crear cuenta</Text>
            <Text style={styles.subtitle}>
              Regístrate para comenzar tu aventura
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              name="displayName"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Nombre completo (opcional)"
                  placeholder="Tu nombre completo"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.displayName?.message}
                  leftIcon={<UserIcon size={20} color={theme.colors.text.tertiary} />}
                  autoCapitalize="words"
                  autoComplete="name"
                  returnKeyType="next"
                  onSubmitEditing={() => focusNextField(emailRef)}
                  accessibilityLabel="Campo de nombre completo"
                />
              )}
            />

            <Controller
              name="email"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  ref={emailRef}
                  label="Correo electrónico"
                  placeholder="tu@email.com"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  leftIcon={<MailIcon size={20} color={theme.colors.text.tertiary} />}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={() => focusNextField(passwordRef)}
                  required
                  accessibilityLabel="Campo de correo electrónico"
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Input
                    ref={passwordRef}
                    label="Contraseña"
                    placeholder="Mínimo 8 caracteres"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    leftIcon={<LockIcon size={20} color={theme.colors.text.tertiary} />}
                    rightIcon={
                      showPassword ? (
                        <EyeOffIcon size={20} color={theme.colors.text.tertiary} />
                      ) : (
                        <EyeIcon size={20} color={theme.colors.text.tertiary} />
                      )
                    }
                    onRightIconPress={() => setShowPassword(!showPassword)}
                    secureTextEntry={!showPassword}
                    autoComplete="password-new"
                    returnKeyType="next"
                    onSubmitEditing={() => focusNextField(confirmPasswordRef)}
                    required
                    accessibilityLabel="Campo de contraseña"
                  />
                  {watchedPassword && (
                    <PasswordStrengthBar password={watchedPassword} />
                  )}
                </View>
              )}
            />

            <Controller
              name="confirmPassword"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  ref={confirmPasswordRef}
                  label="Confirmar contraseña"
                  placeholder="Repite tu contraseña"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.confirmPassword?.message}
                  leftIcon={<LockIcon size={20} color={theme.colors.text.tertiary} />}
                  rightIcon={
                    showConfirmPassword ? (
                      <EyeOffIcon size={20} color={theme.colors.text.tertiary} />
                    ) : (
                      <EyeIcon size={20} color={theme.colors.text.tertiary} />
                    )
                  }
                  onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="password-new"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(onSubmit)}
                  required
                  accessibilityLabel="Campo de confirmación de contraseña"
                />
              )}
            />

            <Controller
              name="acceptTerms"
              control={control}
              render={({ field: { onChange, value } }) => (
                <Checkbox
                  checked={value}
                  onPress={() => onChange(!value)}
                  error={!!errors.acceptTerms}
                  containerStyle={styles.checkboxContainer}
                  accessibilityLabel="Aceptar términos y condiciones"
                >
                  <Text style={styles.termsText}>
                    Acepto los{" "}
                    <Text
                      style={styles.termsLink}
                      onPress={() => {
                        // TODO: Implementar navegación a términos y condiciones
                        Alert.alert("Términos y Condiciones", "Funcionalidad pendiente de implementar");
                      }}
                    >
                      Términos y Condiciones
                    </Text>{" "}
                    y la{" "}
                    <Text
                      style={styles.termsLink}
                      onPress={() => {
                        // TODO: Implementar navegación a política de privacidad
                        Alert.alert("Política de Privacidad", "Funcionalidad pendiente de implementar");
                      }}
                    >
                      Política de Privacidad
                    </Text>
                  </Text>
                </Checkbox>
              )}
            />

            {errors.acceptTerms && (
              <Text style={styles.errorText}>{errors.acceptTerms.message}</Text>
            )}

            <Button
              title={loading ? "Creando cuenta..." : "Crear cuenta"}
              onPress={handleSubmit(onSubmit)}
              disabled={!isValid || !watchedAcceptTerms || loading}
              loading={loading}
              fullWidth
              style={styles.submitButton}
              accessibilityLabel="Botón para crear cuenta"
              accessibilityHint="Toca para registrarte con los datos proporcionados"
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ¿Ya tienes cuenta?{" "}
              <Text
                style={styles.footerLink}
                onPress={() => navigation.navigate("Login")}
                accessibilityRole="link"
              >
                Inicia sesión aquí
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
  },
  title: {
    fontSize: theme.typography.fontSizes['4xl'],
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.fontSizes.lg,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.fontSizes.lg,
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  checkboxContainer: {
    marginVertical: theme.spacing.lg,
  },
  termsText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.fontSizes.sm,
  },
  termsLink: {
    color: theme.colors.primary.main,
    fontWeight: theme.typography.fontWeights.medium,
    textDecorationLine: 'underline',
  },
  errorText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.error.main,
    marginTop: -theme.spacing.sm,
    marginLeft: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  submitButton: {
    marginTop: theme.spacing.lg,
  },
  footer: {
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
  },
  footerText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  footerLink: {
    color: theme.colors.primary.main,
    fontWeight: theme.typography.fontWeights.medium,
    textDecorationLine: 'underline',
  },
});

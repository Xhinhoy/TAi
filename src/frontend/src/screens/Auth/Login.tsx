import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { useAuth } from "../../hooks/useAuth";
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon } from "../../components/icons";
import { colors } from "../../styles/colors";
import { commonStyles } from "../../styles/common";

export default function Login({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });
  const { signInWithEmail, loading } = useAuth();

  const validateForm = () => {
    const newErrors = { email: "", password: "" };
    let isValid = true;

    if (!email) {
      newErrors.email = "El email es requerido";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email inválido";
      isValid = false;
    }

    if (!password) {
      newErrors.password = "La contraseña es requerida";
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const onLogin = async () => {
    if (!validateForm()) return;

    try {
      await signInWithEmail(email, password);
      // El error/éxito ya se maneja en useAuth con notificaciones
    } catch (error: any) {
      // El error ya se maneja en useAuth con notificaciones
    }
  };

  return (
    <KeyboardAvoidingView
      style={commonStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={commonStyles.title}>Bienvenido de vuelta</Text>
            <Text style={commonStyles.caption}>Inicia sesión en tu cuenta</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <MailIcon size={20} color={colors.neutral[500]} />
                <TextInput
                  style={[
                    styles.input,
                    errors.email ? commonStyles.inputError : {},
                  ]}
                  placeholder="Correo electrónico"
                  placeholderTextColor={colors.neutral[400]}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors({ ...errors, email: "" });
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
              {errors.email ? <Text style={commonStyles.errorText}>{errors.email}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <LockIcon size={20} color={colors.neutral[500]} />
                <TextInput
                  style={[
                    styles.input,
                    errors.password ? commonStyles.inputError : {},
                  ]}
                  placeholder="Contraseña"
                  placeholderTextColor={colors.neutral[400]}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors({ ...errors, password: "" });
                  }}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  {showPassword ? (
                    <EyeOffIcon size={20} color={colors.neutral[500]} />
                  ) : (
                    <EyeIcon size={20} color={colors.neutral[500]} />
                  )}
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={commonStyles.errorText}>{errors.password}</Text> : null}
            </View>

            <TouchableOpacity
              style={[
                commonStyles.button,
                loading || (!email || !password) ? commonStyles.buttonDisabled : {},
              ]}
              onPress={onLogin}
              disabled={loading || (!email || !password)}
            >
              <Text style={commonStyles.buttonText}>
                {loading ? "Iniciando sesión..." : "Iniciar sesión"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={commonStyles.caption}>
              ¿No tienes cuenta?{" "}
              <Text
                style={commonStyles.link}
                onPress={() => navigation.replace("Register")}
              >
                Regístrate aquí
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: 12,
    backgroundColor: colors.neutral.white,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.neutral[900],
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 0,
  },
  eyeIcon: {
    padding: 4,
  },
  footer: {
    alignItems: 'center',
  },
});

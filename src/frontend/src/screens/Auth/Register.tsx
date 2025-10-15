import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../../services/firebase";
import { UserIcon, MailIcon, LockIcon, EyeIcon, EyeOffIcon } from "../../components/icons";
import { colors } from "../../styles/colors";
import { commonStyles } from "../../styles/common";

export default function Register({ navigation }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const validateForm = () => {
    const newErrors = {
      name: "",
      email: "",
      password: "",
      confirmPassword: ""
    };
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = "El nombre es requerido";
      isValid = false;
    } else if (name.trim().length < 2) {
      newErrors.name = "El nombre debe tener al menos 2 caracteres";
      isValid = false;
    }

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

    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirma tu contraseña";
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    console.log("Intentando registrar:", email, password);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("Usuario registrado:", userCredential.user);

      // Actualizar el perfil con el nombre
      await updateProfile(userCredential.user, {
        displayName: name.trim()
      });

      Alert.alert("Registro exitoso", `Bienvenido ${name}`, [
        {
          text: "OK",
          onPress: () => navigation.navigate("Login")
        }
      ]);
    } catch (error: any) {
      console.error("Error en el registro:", error.message);
      Alert.alert("Error al registrar", error.message);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = name.trim() && email && password && confirmPassword && password === confirmPassword;

  return (
    <KeyboardAvoidingView
      style={commonStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={commonStyles.title}>Crear cuenta</Text>
            <Text style={commonStyles.caption}>Regístrate para comenzar</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <UserIcon size={20} color={colors.neutral[500]} />
                <TextInput
                  style={[
                    styles.input,
                    errors.name ? commonStyles.inputError : {},
                  ]}
                  placeholder="Nombre completo"
                  placeholderTextColor={colors.neutral[400]}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (errors.name) setErrors({ ...errors, name: "" });
                  }}
                  autoCapitalize="words"
                  autoComplete="name"
                />
              </View>
              {errors.name ? <Text style={commonStyles.errorText}>{errors.name}</Text> : null}
            </View>

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
                    if (errors.confirmPassword && confirmPassword && text === confirmPassword) {
                      setErrors({ ...errors, password: "", confirmPassword: "" });
                    }
                  }}
                  secureTextEntry={!showPassword}
                  autoComplete="password-new"
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

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <LockIcon size={20} color={colors.neutral[500]} />
                <TextInput
                  style={[
                    styles.input,
                    errors.confirmPassword ? commonStyles.inputError : {},
                  ]}
                  placeholder="Confirmar contraseña"
                  placeholderTextColor={colors.neutral[400]}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" });
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="password-new"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  {showConfirmPassword ? (
                    <EyeOffIcon size={20} color={colors.neutral[500]} />
                  ) : (
                    <EyeIcon size={20} color={colors.neutral[500]} />
                  )}
                </TouchableOpacity>
              </View>
              {errors.confirmPassword ? <Text style={commonStyles.errorText}>{errors.confirmPassword}</Text> : null}
            </View>

            <TouchableOpacity
              style={[
                commonStyles.button,
                loading || !isFormValid ? commonStyles.buttonDisabled : {},
              ]}
              onPress={handleRegister}
              disabled={loading || !isFormValid}
            >
              <Text style={commonStyles.buttonText}>
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={commonStyles.caption}>
              ¿Ya tienes cuenta?{" "}
              <Text
                style={commonStyles.link}
                onPress={() => navigation.navigate("Login")}
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

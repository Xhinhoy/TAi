import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../services/firebase";

export default function Login({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const onLogin = async () => {
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, pass);

      if (!userCred.user.emailVerified) {
        Alert.alert("Correo no verificado", "Revisa tu bandeja de entrada y confirma tu correo antes de ingresar.");
        return;
      }

      Alert.alert("Bienvenido", `Hola ${userCred.user.displayName || "usuario"}`);
      navigation.replace("Home");
    } catch (e: any) {
      Alert.alert("Error en login", e.message);
    }
  };

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Iniciar sesión</Text>

      <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput placeholder="Contraseña" value={pass} onChangeText={setPass} secureTextEntry />

      <Button title="Entrar" onPress={onLogin} />

      <Text>
        ¿Sin cuenta?{" "}
        <Text style={{ color: "blue" }} onPress={() => navigation.replace("Register")}>
          Regístrate
        </Text>
      </Text>
    </View>
  );
}

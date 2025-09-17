import React, { useState } from "react";
import { View, TextInput, Button, Text, Alert } from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../services/firebase";

export default function Register({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleRegister = async () => {
    console.log("🔑 Intentando registrar:", email, password);

    if (!email || !password) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("✅ Usuario registrado:", userCredential.user);

      // Opcional: guardar el nombre en Firestore o actualizar perfil
      Alert.alert("Registro exitoso", `Bienvenido ${name || "usuario"}`);

      // Navegar al login o directo al Home
      navigation.navigate("Login");
    } catch (error: any) {
      console.error("❌ Error en el registro:", error.message);
      Alert.alert("Error al registrar", error.message);
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 12 }}>Crear cuenta</Text>

      <TextInput
        placeholder="Nombre"
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, marginBottom: 12, padding: 8, borderRadius: 8 }}
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={{ borderWidth: 1, marginBottom: 12, padding: 8, borderRadius: 8 }}
      />
      <TextInput
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, marginBottom: 12, padding: 8, borderRadius: 8 }}
      />

      <Button title="REGISTRARME" onPress={handleRegister} />

      <Text
        style={{ marginTop: 16, color: "blue" }}
        onPress={() => navigation.navigate("Login")}
      >
        ¿Ya tienes cuenta? Inicia sesión
      </Text>
    </View>
  );
}

import React from "react";
import { View, Text, StyleSheet } from "react-native";

export interface ErrorScreenProps {
  message?: string;
  title?: string;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  message = "Error desconocido",
  title = "Error al cargar la aplicación",
}) => {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "red",
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
  },
});

export default ErrorScreen;

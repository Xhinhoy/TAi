import React from "react";
import { View, Text } from "react-native";

export default function Home() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>
        Bienvenido a la App!
      </Text>
    </View>
  );
}

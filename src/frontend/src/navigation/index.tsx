import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../hooks/useAuth";
import Login from "../screens/Auth/Login";
import Register from "../screens/Auth/Register";
import Search from "../screens/Search/Search";
import Builder from "../screens/Itinerary/Builder";

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const Screen = (t: string) => () => (
  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
    <Text>{t}</Text>
  </View>
);

export default function RootNav() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <Tabs.Navigator>
          <Tabs.Screen name="Home" component={Screen("Home")} />
          <Tabs.Screen name="Buscar" component={Search} />
          <Tabs.Screen name="Recs" component={Screen("Recs")} />
          <Tabs.Screen name="Itinerario" component={Builder} />
          <Tabs.Screen name="Perfil" component={Screen("Perfil")} />
        </Tabs.Navigator>
      ) : (
        <Stack.Navigator>
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Register" component={Register} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}


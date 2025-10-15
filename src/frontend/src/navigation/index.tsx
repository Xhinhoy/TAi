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
import Profile from "../screens/Profile/Profile";
import Home from "../screens/Home/Home";
import PreferencesPage from "../preferences/PreferencesPage";
import { HomeIcon, SearchIcon, StarIcon, MapIcon, UserIcon } from "../components/icons";
import { colors } from "../styles/colors";
import { commonStyles } from "../styles/common";

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const Screen = (title: string) => () => (
  <View style={commonStyles.centerContainer}>
    <Text style={commonStyles.subtitle}>{title}</Text>
    <Text style={commonStyles.body}>Próximamente disponible</Text>
  </View>
);

function TabsNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.neutral[500],
        tabBarStyle: {
          backgroundColor: colors.neutral.white,
          borderTopWidth: 1,
          borderTopColor: colors.neutral[200],
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: colors.neutral.white,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.neutral[100],
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: "600",
          color: colors.neutral[900],
        },
      }}
    >
      <Tabs.Screen
        name="Home"
        component={Home}
        options={{
          title: "Inicio",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <HomeIcon size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Buscar"
        component={Search}
        options={{
          title: "Buscar",
          headerTitle: "Buscar lugares",
          tabBarIcon: ({ color, size }) => (
            <SearchIcon size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Recs"
        component={Screen("Recomendaciones")}
        options={{
          title: "Recs",
          headerTitle: "Recomendaciones",
          tabBarIcon: ({ color, size }) => (
            <StarIcon size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Itinerario"
        component={Builder}
        options={{
          title: "Itinerario",
          headerTitle: "Mi Itinerario",
          tabBarIcon: ({ color, size }) => (
            <MapIcon size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Perfil"
        component={Profile}
        options={{
          title: "Perfil",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <UserIcon size={size} color={color} />
          ),
        }}
      />
    </Tabs.Navigator>
  );
}

export default function RootNav() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={commonStyles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={[commonStyles.caption, { marginTop: 16 }]}>
          Cargando...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={TabsNavigator} />
          <Stack.Screen
            name="Preferencias"
            component={PreferencesPage}
            options={{
              headerShown: true,
              title: "Preferencias",
            }}
          />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.neutral.white },
          }}
        >
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Register" component={Register} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

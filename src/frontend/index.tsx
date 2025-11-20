// C:\Users\vorxr\Documents\PROYECTO\TAi\src\frontend\index.tsx
import { registerRootComponent } from "expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import App from "./src/App";

// Configurar AsyncStorage globalmente para Firebase
if (typeof global !== "undefined") {
  (global as any).AsyncStorage = AsyncStorage;
}

registerRootComponent(App);

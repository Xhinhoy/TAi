export default {
  expo: {
    name: "Itinerarios",
    slug: "itinerarios",
    scheme: "itinerarios",
    version: "1.0.0",
    orientation: "portrait",
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      firebase: {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
      }
    }
  }
}

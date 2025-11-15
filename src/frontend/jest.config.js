module.exports = {
  preset: "react-native",
  testMatch: ["**/__tests__/**/*.test.(ts|tsx|js)"],
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|@react-navigation|@expo|expo|expo-constants|expo-status-bar|@expo)/)",
  ],
};

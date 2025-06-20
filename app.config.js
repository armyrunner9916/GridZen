export default {
  expo: {
    name: "GridZen",
    slug: "GridZen",
    version: "1.0.2", // User-facing version
    orientation: "portrait",
    icon: "./assets/images/playstore.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#000000"
    },
    updates: {
      fallbackToCacheTimeout: 0
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.steveomatic.gridzen",
      buildNumber: "3"
    },
    android: {
      package: "com.steveomatic.gridzen",
      versionCode: 4, // 🔥 Bump this for Play Store
      adaptiveIcon: {
        foregroundImage: "./assets/images/playstore.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: ["expo-av"],
    extra: {
      eas: {
        projectId: "7b827370-c20c-4ebc-ad37-5793d67d670f"
      }
    }
  }
};
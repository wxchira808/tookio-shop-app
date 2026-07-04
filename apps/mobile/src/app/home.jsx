import { Redirect } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

export default function HomeRoute() {
  useEffect(() => {
    if (Platform.OS === "web") {
      // Redirect web users to the original Frappe marketing home page
      window.location.replace("https://shop.tookio.co.ke/home");
    }
  }, []);

  if (Platform.OS === "web") {
    return null; // Will be handled by window.location redirect
  }

  // Fallback for native/Expo Go
  return <Redirect href="/" />;
}

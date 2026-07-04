import { Redirect } from "expo-router";

export default function HomeRoute() {
  // Directly redirect /home to the app's root page (which routes to login/auth if not authenticated)
  // This keeps the user within the PWA container and avoids glitchy redirects to the Frappe site.
  return <Redirect href="/" />;
}

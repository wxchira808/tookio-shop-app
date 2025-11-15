import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { getUserDetails, getLoggedUser } from "../frappeApi";

const USE_FRAPPE_AUTH = process.env.EXPO_PUBLIC_USE_FRAPPE_AUTH === 'true';

export const useUser = () => {
  const { auth, isReady } = useAuth();
  const [userData, setUserData] = useState(auth?.user || null);
  const [loading, setLoading] = useState(!isReady);

  const fetchUser = useCallback(async () => {
    if (!auth) return null;

    // If using Frappe auth, fetch fresh user data including subscription
    if (USE_FRAPPE_AUTH) {
      try {
        setLoading(true);
        const loggedUser = await getLoggedUser();
        const details = await getUserDetails(loggedUser);
        setUserData(details);
        return details;
      } catch (error) {
        console.error('Error fetching user details:', error);
        return auth?.user || null;
      } finally {
        setLoading(false);
      }
    }

    return auth?.user || null;
  }, [auth]);

  // Fetch user data on mount if using Frappe
  useEffect(() => {
    if (USE_FRAPPE_AUTH && isReady && auth) {
      fetchUser();
    } else {
      setUserData(auth?.user || null);
      setLoading(!isReady);
    }
  }, [auth, isReady]);

  return { user: userData, data: userData, loading, refetch: fetchUser };
};
export default useUser;

import { useState, useEffect } from "react";
import { showToast } from "../utils/toast.js";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast.success("Internet connection restored.");
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast.warning("Network connection lost. You are currently offline.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline };
}

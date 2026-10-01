import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { showToast } from "../utils/toast.js";

interface UseAndroidBackButtonProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export function useAndroidBackButton({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}: UseAndroidBackButtonProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const lastBackTimeRef = useRef<number>(0);

  useEffect(() => {
    let handler: any = null;

    const setupListener = async () => {
      handler = await CapacitorApp.addListener("backButton", (event) => {
        // 1. If any active modal / popup dialog overlay is open, close it first!
        const modalCloseBtn = document.querySelector<HTMLButtonElement>(
          'div.fixed.inset-0 button[aria-label="Close"], div.fixed.inset-0 button[title="Close"], div.fixed.inset-0 button[title="Close modal"], div.fixed.inset-0 button.modal-close-btn'
        );
        if (modalCloseBtn) {
          modalCloseBtn.click();
          return;
        }

        // 2. Close mobile navigation drawer if open
        if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
          return;
        }

        const isRoot = location.pathname === "/" || location.pathname === "/dashboard" || location.pathname === "";

        // 3. If not at root screen, navigate to previous screen in history
        if (!isRoot && event.canGoBack) {
          navigate(-1);
          return;
        }

        if (!isRoot) {
          // Fallback: navigate to dashboard root
          navigate("/");
          return;
        }

        // 4. User is at Root / Dashboard screen: Handle double-tap to exit safely
        const now = Date.now();
        if (now - lastBackTimeRef.current < 2000) {
          CapacitorApp.exitApp();
        } else {
          lastBackTimeRef.current = now;
          showToast.info("Press back again to exit application");
        }
      });
    };

    setupListener().catch(() => {
      // Running on web browser, CapacitorApp backButton listener not supported
    });

    return () => {
      if (handler && typeof handler.remove === "function") {
        handler.remove();
      }
    };
  }, [location.pathname, isMobileMenuOpen, navigate, setIsMobileMenuOpen]);
}

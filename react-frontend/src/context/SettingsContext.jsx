import { createContext, useContext, useState, useEffect, useCallback } from "react";

const SETTINGS_KEY = "cdbms_admin_settings";

export const DEFAULT_SETTINGS = {
  // Platform
  siteName: "CDBMS",
  siteTagline: "Premium Digital Billboard Network",
  contactEmail: "admin@cdbms.com",
  timezone: "Asia/Karachi",
  dateFormat: "DD/MM/YYYY",
  // Payments
  currency: "PKR",
  stripeKey: "",
  taxRate: "0",
  minBookingPKR: "5",
  // Security
  twoFactorAdmin: false,
  requireEmailVerify: true,
  ipWhitelist: false,
  sslForce: true,
  // Notifications
  notifyNewAd: true,
  notifyPayment: true,
  notifyBooking: true,
  notifySignup: false,
  emailDigest: false,
  // System
  maintenanceMode: false,
  allowNewRegistrations: true,
  autoApproveAds: false,
  showPricingPublicly: true,
  enableAnalytics: true,
};

const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  saveSettings: () => {},
  isLoaded: false,
});

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migration: if stored minBookingPKR is the old stale default "500",
        // replace it with the new default "5" (PKR/minute) so billboard
        // creation picks up the correct floor rate automatically.
        if (parsed.minBookingPKR === "500") {
          parsed.minBookingPKR = DEFAULT_SETTINGS.minBookingPKR;
        }
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Apply side-effects whenever settings change
  useEffect(() => {
    if (!isLoaded) return;

    // Update browser/document title
    document.title = settings.siteName
      ? `${settings.siteName} — Admin`
      : "CDBMS — Admin";

  }, [settings.siteName, isLoaded]);

  const saveSettings = useCallback((next) => {
    setSettings(prev => {
      const merged = { ...prev, ...next };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      } catch (e) {
        console.error("Failed to save settings:", e);
      }
      return merged;
    });
  }, []); // no deps needed — uses functional updater, no stale closure

  return (
    <SettingsContext.Provider value={{ settings, saveSettings, isLoaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

/** Utility: format currency using current platform currency setting */
export function useCurrencyFormatter() {
  const { settings } = useSettings();
  return (amount) =>
    new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: settings.currency || "PKR",
      minimumFractionDigits: 0,
    }).format(amount || 0);
}

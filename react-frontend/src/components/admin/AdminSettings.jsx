import { useEffect, useState } from "react";
import { AlertTriangle, CreditCard, Globe, Save, Settings2, ShieldCheck, ToggleLeft, ToggleRight, Wallet } from "lucide-react";
import { useSettings, DEFAULT_SETTINGS } from "../../context/SettingsContext";
import { getAdminPaymentSettings, updateAdminPaymentSettings } from "../../services/adminApi";

const PAYMENT_DEFAULTS = {
  manualPaymentEnabled: false,
  merchantLabel: "",
  payfastEnabled: false,
  payfastMerchantLabel: "",
  payfastBaseUrl: "",
  payfastMerchantId: "",
  payfastSecuredKey: "",
  payfastHashKey: "",
  payfastMerchantCategoryCode: "",
  easypaisaEnabled: false,
  bankCardEnabled: false,
  payfastEasypaisaBankCode: "",
  payfastEasypaisaInstrumentId: "",
  payfastCardBankCode: "",
  payfastCardInstrumentId: "",
  payfastJazzCashBankCode: "",
  payfastJazzCashInstrumentId: "",
  settlementAccountTitle: "",
  settlementEasypaisaNumber: "",
  settlementJazzCashNumber: "",
  settlementBankName: "",
  settlementBankIban: "",
  settlementInstructions: "",
};

const cleanSetting = (value) => String(value || "").trim();

function buildGatewayReadiness(paymentSettings) {
  const coreMissing = [];
  const methodMissing = {
    easypaisa: [],
    card: [],
  };

  if (!paymentSettings.payfastEnabled) coreMissing.push("Enable PayFast Checkout");
  if (!cleanSetting(paymentSettings.payfastMerchantLabel || paymentSettings.merchantLabel)) coreMissing.push("Display business label");
  if (!cleanSetting(paymentSettings.payfastBaseUrl)) coreMissing.push("PayFast base URL");
  if (!cleanSetting(paymentSettings.payfastMerchantId)) coreMissing.push("Merchant ID");
  if (!cleanSetting(paymentSettings.payfastMerchantCategoryCode)) coreMissing.push("Merchant category code");
  if (!cleanSetting(paymentSettings.payfastSecuredKey)) coreMissing.push("Secured Key");
  if (!cleanSetting(paymentSettings.payfastHashKey)) coreMissing.push("Hash Key");
  if (!paymentSettings.easypaisaEnabled && !paymentSettings.bankCardEnabled) {
    coreMissing.push("Enable at least one customer payment method");
  }

  if (paymentSettings.easypaisaEnabled) {
    if (!cleanSetting(paymentSettings.payfastEasypaisaBankCode)) methodMissing.easypaisa.push("Easypaisa bank code");
    if (!cleanSetting(paymentSettings.payfastEasypaisaInstrumentId)) methodMissing.easypaisa.push("Easypaisa instrument ID");
  }

  if (paymentSettings.bankCardEnabled) {
    if (!cleanSetting(paymentSettings.payfastCardBankCode)) methodMissing.card.push("Card bank code");
    if (!cleanSetting(paymentSettings.payfastCardInstrumentId)) methodMissing.card.push("Card instrument ID");
  }

  const ready =
    coreMissing.length === 0 &&
    methodMissing.easypaisa.length === 0 &&
    methodMissing.card.length === 0;

  return {
    ready,
    coreMissing,
    methodMissing,
  };
}

function ToggleRow({ label, description, checked, onToggle, danger = false }) {
  return (
    <div
      className={`flex items-center justify-between rounded-2xl border px-5 py-4 ${
        danger && checked ? "border-red-500/30 bg-red-500/10" : "border-white/5 bg-[#0A0F1C]/60"
      }`}
    >
      <div>
        <p className={`text-sm font-black ${danger && checked ? "text-red-300" : "text-white"}`}>{label}</p>
        <p className="mt-1 text-xs text-blue-100/45">{description}</p>
      </div>
      <button type="button" onClick={onToggle} className="ml-4">
        {checked ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-sky-300">
            <ToggleRight size={16} /> On
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-white/35">
            <ToggleLeft size={16} /> Off
          </span>
        )}
      </button>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text", hint = "" }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-blue-100/45">{label}</span>
      <input
        type={type}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-[#0A0F1C] px-4 py-3 text-white placeholder:text-blue-100/20 focus:border-sky-500 focus:outline-none"
      />
      {hint ? <span className="mt-2 block text-xs text-blue-100/45">{hint}</span> : null}
    </label>
  );
}

function TextareaField({ label, value, onChange, placeholder, hint = "" }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-blue-100/45">{label}</span>
      <textarea
        rows={4}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-[#0A0F1C] px-4 py-3 text-white placeholder:text-blue-100/20 focus:border-sky-500 focus:outline-none"
      />
      {hint ? <span className="mt-2 block text-xs text-blue-100/45">{hint}</span> : null}
    </label>
  );
}

export default function AdminSettings() {
  const { settings, saveSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [paymentSettings, setPaymentSettings] = useState(PAYMENT_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getAdminPaymentSettings();
        setPaymentSettings({ ...PAYMENT_DEFAULTS, ...(res.data || {}) });
      } catch (error) {
        setMessage(error.response?.data?.message || "Could not load admin payment settings.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const updateLocalField = (key, value) => {
    setLocalSettings((current) => ({ ...current, [key]: value }));
  };

  const updatePaymentField = (key, value) => {
    setPaymentSettings((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    setSaveState("saving");
    setMessage("");
    try {
      saveSettings(localSettings);
      await updateAdminPaymentSettings(paymentSettings);
      setSaveState("saved");
      setMessage("Platform and payment settings saved successfully.");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (error) {
      setSaveState("idle");
      setMessage(error.response?.data?.message || "Could not save settings.");
    }
  };

  const handleResetPlatform = () => {
    if (!window.confirm("Reset local platform settings to default values?")) return;
    setLocalSettings(DEFAULT_SETTINGS);
  };

  const paymentReadiness = buildGatewayReadiness(paymentSettings);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-white/5 bg-[#131A2A]/70 text-white/60">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-16">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black text-white">
            <Settings2 className="text-sky-400" /> Platform and Payment Settings
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-blue-100/60">
            Control platform behavior and configure the live PayFast checkout used for Easypaisa and bank card payments.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleResetPlatform}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white/70 hover:bg-white/10 hover:text-white"
          >
            Reset Platform Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveState === "saving"}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-sm font-black text-white hover:bg-sky-400 disabled:opacity-50"
          >
            <Save size={16} />
            {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Save Settings"}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm ${
            saveState === "saved"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/5 bg-[#131A2A]/80 p-6">
            <div className="flex items-center gap-3">
              <Globe className="text-sky-400" />
              <h2 className="text-xl font-black text-white">Platform Controls</h2>
            </div>
            <div className="mt-6 grid gap-4">
              <InputField
                label="Platform Name"
                value={localSettings.siteName}
                onChange={(value) => updateLocalField("siteName", value)}
                placeholder="CDBMS"
              />
              <InputField
                label="Tagline"
                value={localSettings.siteTagline}
                onChange={(value) => updateLocalField("siteTagline", value)}
                placeholder="Premium Digital Billboard Network"
              />
              <InputField
                label="Support Email"
                value={localSettings.contactEmail}
                onChange={(value) => updateLocalField("contactEmail", value)}
                placeholder="admin@example.com"
                type="email"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  label="Minimum Rate (PKR/min)"
                  value={localSettings.minBookingPKR}
                  onChange={(value) => updateLocalField("minBookingPKR", value)}
                  placeholder="2"
                  type="number"
                />
                <InputField
                  label="Tax Rate (%)"
                  value={localSettings.taxRate}
                  onChange={(value) => updateLocalField("taxRate", value)}
                  placeholder="0"
                  type="number"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/5 bg-[#131A2A]/80 p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-emerald-400" />
              <h2 className="text-xl font-black text-white">Operational Toggles</h2>
            </div>
            <div className="mt-6 space-y-4">
              <ToggleRow
                label="Maintenance Mode"
                description="Block advertiser access while keeping the admin panel available."
                checked={localSettings.maintenanceMode}
                onToggle={() => updateLocalField("maintenanceMode", !localSettings.maintenanceMode)}
                danger
              />
              <ToggleRow
                label="Allow New Signups"
                description="Enable or disable new advertiser registrations."
                checked={localSettings.allowNewRegistrations}
                onToggle={() => updateLocalField("allowNewRegistrations", !localSettings.allowNewRegistrations)}
              />
              <ToggleRow
                label="Auto Approve Ads"
                description="Approve the ad creative when the booking itself is approved."
                checked={localSettings.autoApproveAds}
                onToggle={() => updateLocalField("autoApproveAds", !localSettings.autoApproveAds)}
              />
              <ToggleRow
                label="Force HTTPS"
                description="Show that SSL should be enforced in deployed environments."
                checked={localSettings.sslForce}
                onToggle={() => updateLocalField("sslForce", !localSettings.sslForce)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/5 bg-[#131A2A]/80 p-6">
            <div className="flex items-center gap-3">
              <CreditCard className="text-cyan-400" />
              <div>
                <h2 className="text-xl font-black text-white">Gateway Checkout</h2>
                <p className="mt-1 text-sm text-blue-100/50">
                  Configure the PayFast merchant credentials and the payment instruments advertisers can use during booking.
                </p>
              </div>
            </div>

            <div
              className={`mt-6 rounded-2xl border px-5 py-4 text-sm ${
                paymentReadiness.ready
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-100"
              }`}
            >
              <p className="font-black">
                {paymentReadiness.ready ? "Live checkout is ready." : "Live checkout is not ready yet."}
              </p>
              {paymentReadiness.ready ? (
                <p className="mt-1 text-emerald-100/80">
                  Approved bookings can now move into the real PayFast payment flow for the enabled methods.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {paymentReadiness.coreMissing.length > 0 && (
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200/80">Complete These First</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-100/85">
                        {paymentReadiness.coreMissing.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {paymentSettings.easypaisaEnabled && paymentReadiness.methodMissing.easypaisa.length > 0 && (
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200/80">Easypaisa Still Needs</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-100/85">
                        {paymentReadiness.methodMissing.easypaisa.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {paymentSettings.bankCardEnabled && paymentReadiness.methodMissing.card.length > 0 && (
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200/80">Cards Still Need</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-100/85">
                        {paymentReadiness.methodMissing.card.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 space-y-4">
              <ToggleRow
                label="Enable PayFast Checkout"
                description="Allow booking payments to go through PayFast instead of the old manual reference flow."
                checked={paymentSettings.payfastEnabled}
                onToggle={() => updatePaymentField("payfastEnabled", !paymentSettings.payfastEnabled)}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <ToggleRow
                  label="Offer Easypaisa"
                  description="Show Easypaisa as a live wallet checkout option for advertisers."
                  checked={paymentSettings.easypaisaEnabled}
                  onToggle={() => updatePaymentField("easypaisaEnabled", !paymentSettings.easypaisaEnabled)}
                />
                <ToggleRow
                  label="Offer Bank Cards"
                  description="Allow debit and credit card checkout through PayFast."
                  checked={paymentSettings.bankCardEnabled}
                  onToggle={() => updatePaymentField("bankCardEnabled", !paymentSettings.bankCardEnabled)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/5 bg-[#131A2A]/80 p-6">
            <div className="flex items-center gap-3">
              <Wallet className="text-emerald-400" />
              <div>
                <h2 className="text-xl font-black text-white">Merchant Credentials</h2>
                <p className="mt-1 text-sm text-blue-100/50">These values stay in the admin account and are used only by the backend gateway calls.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <InputField
                label="Display Business Label"
                value={paymentSettings.payfastMerchantLabel || paymentSettings.merchantLabel}
                onChange={(value) => {
                  updatePaymentField("payfastMerchantLabel", value);
                  updatePaymentField("merchantLabel", value);
                }}
                placeholder="Nisha Media Network"
                hint="Shown to advertisers in checkout."
              />
              <InputField
                label="PayFast Base URL"
                value={paymentSettings.payfastBaseUrl}
                onChange={(value) => updatePaymentField("payfastBaseUrl", value)}
                placeholder="https://ipguat.apps.net.pk/Ecommerce/api/Transaction"
                hint="Use the official sandbox or live gateway base URL from your merchant account."
              />
              <InputField
                label="Merchant ID"
                value={paymentSettings.payfastMerchantId}
                onChange={(value) => updatePaymentField("payfastMerchantId", value)}
                placeholder="Merchant ID"
              />
              <InputField
                label="Merchant Category Code"
                value={paymentSettings.payfastMerchantCategoryCode}
                onChange={(value) => updatePaymentField("payfastMerchantCategoryCode", value)}
                placeholder="Merchant category code"
              />
              <InputField
                label="Secured Key"
                value={paymentSettings.payfastSecuredKey}
                onChange={(value) => updatePaymentField("payfastSecuredKey", value)}
                placeholder="Secured key"
                type="password"
              />
              <InputField
                label="Hash Key"
                value={paymentSettings.payfastHashKey}
                onChange={(value) => updatePaymentField("payfastHashKey", value)}
                placeholder="Hash key"
                type="password"
                hint="Used to create the HMAC SHA-256 secured hash required by PayFast."
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/5 bg-[#131A2A]/80 p-6">
            <div className="flex items-center gap-3">
              <CreditCard className="text-sky-400" />
              <div>
                <h2 className="text-xl font-black text-white">Instrument Mapping</h2>
                <p className="mt-1 text-sm text-blue-100/50">Enter the instrument IDs and bank codes provided by PayFast for each method you want to accept.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <InputField
                label="Easypaisa Bank Code"
                value={paymentSettings.payfastEasypaisaBankCode}
                onChange={(value) => updatePaymentField("payfastEasypaisaBankCode", value)}
                placeholder="Easypaisa bank code"
              />
              <InputField
                label="Easypaisa Instrument ID"
                value={paymentSettings.payfastEasypaisaInstrumentId}
                onChange={(value) => updatePaymentField("payfastEasypaisaInstrumentId", value)}
                placeholder="Easypaisa instrument ID"
              />
              <InputField
                label="Card Bank Code"
                value={paymentSettings.payfastCardBankCode}
                onChange={(value) => updatePaymentField("payfastCardBankCode", value)}
                placeholder="Card bank code"
              />
              <InputField
                label="Card Instrument ID"
                value={paymentSettings.payfastCardInstrumentId}
                onChange={(value) => updatePaymentField("payfastCardInstrumentId", value)}
                placeholder="Card instrument ID"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/5 bg-[#131A2A]/80 p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-amber-300" />
              <div>
                <h2 className="text-xl font-black text-white">Checkout Display Details</h2>
                <p className="mt-1 text-sm text-blue-100/50">These are safe customer-facing details shown during checkout for transparency.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <InputField
                label="Account Title"
                value={paymentSettings.settlementAccountTitle}
                onChange={(value) => updatePaymentField("settlementAccountTitle", value)}
                placeholder="Nisha Ali"
              />
              <InputField
                label="Easypaisa Number"
                value={paymentSettings.settlementEasypaisaNumber}
                onChange={(value) => updatePaymentField("settlementEasypaisaNumber", value)}
                placeholder="03xxxxxxxxx"
              />
              <InputField
                label="Bank Name"
                value={paymentSettings.settlementBankName}
                onChange={(value) => updatePaymentField("settlementBankName", value)}
                placeholder="Meezan Bank"
              />
              <InputField
                label="Bank IBAN / Account"
                value={paymentSettings.settlementBankIban}
                onChange={(value) => updatePaymentField("settlementBankIban", value)}
                placeholder="PKxx..."
              />
              <div className="md:col-span-2">
                <TextareaField
                  label="Checkout Instructions"
                  value={paymentSettings.settlementInstructions}
                  onChange={(value) => updatePaymentField("settlementInstructions", value)}
                  placeholder="Example: Complete the approval in your Easypaisa app or bank app when PayFast prompts you."
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 text-amber-300" />
              <div>
                <p className="font-black text-amber-200">Important</p>
                <p className="mt-1">
                  Real Easypaisa and card payments require valid live merchant credentials and a reachable public callback URL.
                  Localhost or a LAN IP can work for limited testing on the same network, but real customer devices outside your network need a public HTTPS deployment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

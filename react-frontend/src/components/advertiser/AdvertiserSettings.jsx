import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, User, Bell, Shield, CreditCard,
  Save, CheckCircle2, AlertTriangle, Eye, EyeOff,
  ToggleLeft, ToggleRight, Phone, Mail, Globe
} from "lucide-react";
import { getProfile } from "../../api";

const ADV_SETTINGS_KEY = "cdbms_advertiser_settings";

const DEFAULT = {
  // Profile display
  companyName: "",
  phone: "",
  website: "",
  // Notification prefs
  notifyAdApproved:  true,
  notifyAdRejected:  true,
  notifyNewBooking:  true,
  notifyPayment:     true,
  emailDigest:       false,
  // Privacy
  showProfilePublic: false,
  twoFactorAuth:     false,
  // Payment prefs
  savedCardLast4:    "",
  autoPay:           false,
};

const SECTIONS = [
  {
    id: "profile", label: "Profile Extras", icon: User, color: "#6366f1",
    fields: [
      { key:"companyName", label:"Company / Brand Name", type:"text",  placeholder:"e.g. Nisha Brands Ltd.",   desc:"Shown on invoices and booking records" },
      { key:"phone",       label:"WhatsApp / Contact #", type:"text",  placeholder:"+92 300 0000000",          desc:"Admin may contact you on this number" },
      { key:"website",     label:"Website URL",          type:"url",   placeholder:"https://yourdomain.com",   desc:"Optional — shown on your public profile" },
    ],
    toggles: [],
  },
  {
    id: "notifications", label: "Notification Preferences", icon: Bell, color: "#f97316",
    fields: [],
    toggles: [
      { key:"notifyAdApproved", label:"Ad Approved Alert",    desc:"Get notified when admin approves one of your ads" },
      { key:"notifyAdRejected", label:"Ad Rejected Alert",    desc:"Get notified when admin rejects one of your ads" },
      { key:"notifyNewBooking", label:"Booking Update Alert", desc:"Alerts for any booking status changes" },
      { key:"notifyPayment",    label:"Payment Receipt",      desc:"Confirm when your payment is processed" },
      { key:"emailDigest",      label:"Weekly Email Summary", desc:"Receive a weekly digest of your campaign performance" },
    ],
  },
  {
    id: "privacy", label: "Privacy & Security", icon: Shield, color: "#10b981",
    fields: [],
    toggles: [
      { key:"showProfilePublic", label:"Public Profile",  desc:"Allow other advertisers to see your brand name and campaigns" },
      { key:"twoFactorAuth",     label:"Two-Factor Auth", desc:"Add an extra layer of security to your login" },
    ],
  },
  {
    id: "payment", label: "Payment Preferences", icon: CreditCard, color: "#8b5cf6",
    fields: [
      { key:"savedCardLast4", label:"Saved Card (Last 4 digits)", type:"number", placeholder:"e.g. 4242", desc:"Read-only — managed via Stripe dashboard" },
    ],
    toggles: [
      { key:"autoPay", label:"Auto-Pay on Booking", desc:"Automatically charge saved card when a booking is confirmed" },
    ],
  },
];

export default function AdvertiserSettings() {
  const [settings, setSettings] = useState(DEFAULT);
  const [activeSection, setActiveSection] = useState("profile");
  const [saveState, setSaveState] = useState("idle");
  const [hasChanges, setHasChanges] = useState(false);
  const [profileName, setProfileName] = useState("Advertiser");
  const [profileEmail, setProfileEmail] = useState("");

  useEffect(() => {
    // Load saved settings
    try {
      const stored = localStorage.getItem(ADV_SETTINGS_KEY);
      if (stored) setSettings({ ...DEFAULT, ...JSON.parse(stored) });
    } catch {}
    // Load profile info
    getProfile().then(r => {
      setProfileName(r.data.name || "Advertiser");
      setProfileEmail(r.data.email || "");
    }).catch(() => {});
  }, []);

  const setField = (key, val) => {
    setSettings(p => ({ ...p, [key]: val }));
    setHasChanges(true);
  };
  const toggleField = (key) => {
    setSettings(p => ({ ...p, [key]: !p[key] }));
    setHasChanges(true);
  };

  const handleSave = () => {
    setSaveState("saving");
    setTimeout(() => {
      localStorage.setItem(ADV_SETTINGS_KEY, JSON.stringify(settings));
      setSaveState("saved");
      setHasChanges(false);
      setTimeout(() => setSaveState("idle"), 2500);
    }, 600);
  };

  const current = SECTIONS.find(s => s.id === activeSection);
  const initials = profileName.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

  return (
    <div className="flex flex-col gap-6 pb-16 min-h-screen bg-darkBg text-textMain">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute w-[500px] h-[500px] bg-indigo-600 opacity-5 blur-[120px] top-20 left-10 rounded-full" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <Settings className="text-indigo-400" /> Account Settings
            </h1>
            <p className="text-blue-100/50 mt-1 text-sm">
              {hasChanges
                ? <span className="text-amber-400 font-bold flex items-center gap-2"><AlertTriangle size={13} />Unsaved changes</span>
                : "All preferences saved and active."}
            </p>
          </div>
          <motion.button whileTap={{ scale:0.97 }} onClick={handleSave}
            disabled={!hasChanges || saveState === "saving"}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
              saveState === "saved"  ? "bg-emerald-500 text-white shadow-emerald-500/30"
            : hasChanges            ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/30"
            : "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed"}`}>
            {saveState === "saving" && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saveState === "saved"  && <CheckCircle2 size={18} />}
            {saveState === "idle"   && <Save size={18} />}
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved!" : "Save Changes"}
          </motion.button>
        </div>

        {/* Unsaved banner */}
        <AnimatePresence>
          {hasChanges && (
            <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}
              className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-amber-400" />
                <p className="text-sm font-bold text-amber-300">You have unsaved changes.</p>
              </div>
              <button onClick={handleSave} className="text-xs font-black text-amber-400 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 px-4 py-2 rounded-xl transition-all">
                Save Now
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left: account card + nav */}
          <div className="flex flex-col gap-4">
            {/* Avatar card */}
            <div className="bg-[#131A2A]/80 backdrop-blur-md border border-white/5 rounded-3xl p-6 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-white text-xl mx-auto mb-3"
                style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
                {initials}
              </div>
              <p className="font-bold text-white">{profileName}</p>
              <p className="text-xs text-indigo-300/60 mt-0.5">{profileEmail}</p>
              <div className="mt-3 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 inline-flex">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Advertiser</span>
              </div>
            </div>

            {/* Section nav */}
            <div className="flex flex-col gap-2">
              {SECTIONS.map(s => {
                const Icon = s.icon;
                const isActive = s.id === activeSection;
                return (
                  <button key={s.id} onClick={() => setActiveSection(s.id)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all text-left border ${isActive ? "text-white" : "text-blue-200/50 hover:text-white hover:bg-white/5 border-transparent"}`}
                    style={isActive ? { backgroundColor: s.color+"15", border:`1px solid ${s.color}30` } : {}}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: s.color+(isActive?"25":"10") }}>
                      <Icon size={16} style={{ color: s.color }} />
                    </div>
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: settings panel */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div key={activeSection}
                initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                transition={{ duration:0.18 }}
                className="bg-[#131A2A]/80 backdrop-blur-md border border-white/5 rounded-3xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.3)]">

                {/* Section header */}
                <div className="flex items-center gap-3 mb-8 pb-5 border-b border-white/5">
                  {(() => { const Icon = current.icon; return (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: current.color+"15" }}>
                      <Icon size={20} style={{ color: current.color }} />
                    </div>
                  ); })()}
                  <div>
                    <h2 className="text-lg font-bold text-white">{current.label}</h2>
                    <p className="text-xs text-blue-200/40 mt-0.5">Manage your {current.label.toLowerCase()}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  {/* Text fields */}
                  {current.fields?.map(field => (
                    <div key={field.key}>
                      <label className="text-xs font-black text-blue-200/50 uppercase tracking-widest mb-1 block">{field.label}</label>
                      <p className="text-xs text-blue-200/25 mb-2.5 leading-relaxed">{field.desc}</p>
                      <input type={field.type || "text"} value={settings[field.key] || ""}
                        onChange={e => setField(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full bg-[#0A0F1C] border border-blue-500/20 text-white rounded-xl px-4 py-3.5 focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-blue-200/20" />
                    </div>
                  ))}

                  {/* Toggles */}
                  {current.toggles?.map(t => (
                    <div key={t.key} className="flex justify-between items-center py-5 border-b border-white/5 last:border-0 rounded-xl px-4">
                      <div>
                        <p className="text-sm font-bold text-white mb-1">{t.label}</p>
                        <p className="text-xs text-blue-200/40 leading-relaxed max-w-xs">{t.desc}</p>
                      </div>
                      <button onClick={() => toggleField(t.key)} className="ml-6 flex-shrink-0 transition-all">
                        {settings[t.key] ? (
                          <div className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full border bg-indigo-500/20 border-indigo-500/30 text-indigo-400">
                            <ToggleRight size={16} /> ON
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-blue-200/40 text-xs font-black px-3 py-1.5 rounded-full">
                            <ToggleLeft size={16} /> OFF
                          </div>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useSettings } from "../../context/SettingsContext";
import { motion } from "framer-motion";
import { Settings, Clock } from "lucide-react";

export default function MaintenancePage() {
  const { settings } = useSettings();
  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-6">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[600px] h-[600px] bg-amber-600 opacity-10 blur-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-lg w-full text-center">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-8">
          <Settings size={36} className="text-amber-400 animate-spin" style={{ animationDuration: "4s" }} />
        </div>
        <h1 className="text-4xl font-black text-white mb-4">
          {settings.siteName} is Under Maintenance
        </h1>
        <p className="text-blue-100/60 text-lg leading-relaxed mb-8">
          {settings.siteTagline || "We're performing scheduled maintenance to improve your experience. We'll be back shortly."}
        </p>
        <div className="bg-[#131A2A]/80 border border-amber-500/20 rounded-2xl px-6 py-4 flex items-center justify-center gap-3">
          <Clock size={16} className="text-amber-400" />
          <span className="text-amber-300 font-medium text-sm">Please check back soon. Contact: {settings.contactEmail}</span>
        </div>
      </motion.div>
    </div>
  );
}

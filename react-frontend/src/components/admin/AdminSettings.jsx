import { useState } from "react";

export default function AdminSettings() {
  const [settings, setSettings] = useState({ siteName: "CDBMS", contactEmail: "admin@cdbms.com", currency: "PKR", maintenance: false });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    // In a real app, send to backend to update settings (store in DB)
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium">Site Name</label><input type="text" className="mt-1 w-full border rounded-lg p-2" value={settings.siteName} onChange={e => setSettings({...settings, siteName: e.target.value})} /></div>
          <div><label className="block text-sm font-medium">Contact Email</label><input type="email" className="mt-1 w-full border rounded-lg p-2" value={settings.contactEmail} onChange={e => setSettings({...settings, contactEmail: e.target.value})} /></div>
          <div><label className="block text-sm font-medium">Default Currency</label><select className="mt-1 w-full border rounded-lg p-2" value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})}><option>PKR</option><option>USD</option></select></div>
          <div><label className="flex items-center gap-2"><input type="checkbox" checked={settings.maintenance} onChange={e => setSettings({...settings, maintenance: e.target.checked})} /> Maintenance Mode</label></div>
          <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Save Settings</button>
          {saved && <p className="text-green-600 text-sm">Settings saved!</p>}
        </div>
      </div>
    </div>
  );
}
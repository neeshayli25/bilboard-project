import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Edit, Trash2, Power, MapPin, Monitor, X, Upload, Calendar, Clock, CheckCircle2, AlertCircle, Copy, ExternalLink } from "lucide-react";
import { getBillboards, createBillboard, updateBillboard, deleteBillboard, rotateBillboardDisplayToken } from "../../services/adminApi";
import { useSettings } from "../../context/SettingsContext";

const sizeOptions = ["10ft x 20ft", "14ft x 48ft", "8ft x 16ft", "12ft x 30ft", "Custom"];
const typeOptions = ["Digital LED", "LCD", "Static", "Neon"];
const resolutionOpts = ["1920x1080", "2560x1440", "3840x2160", "1280x720", "Other"];

const EMPTY_FORM = {
  name: "", city: "", location: "", size: sizeOptions[0], type: "Digital LED",
  resolution: "1920x1080", pricePerMinute: "", status: "active"
};

// ── Per-date slot structure:
// dateSlots: { "2026-04-20": ["08:00-09:30", "14:00-16:00"], "2026-04-21": [...] }

export default function AdminBillboards() {
  const { settings } = useSettings();
  // Always reads live from settings — no hardcoded fallback
  const minRate = parseFloat(settings.minBookingPKR) || 0;

  const [billboards, setBillboards] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [priceError, setPriceError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [rotatingId, setRotatingId] = useState("");

  // ── Per-date slot state ─────────────────────────────────────────────────────
  // dateSlots: { [date]: [ "HH:MM-HH:MM", ... ] }
  const [dateSlots, setDateSlots] = useState({});

  // Current editing row
  const [activeDate, setActiveDate] = useState("");
  const [slotStart, setSlotStart]   = useState("");
  const [slotEnd, setSlotEnd]       = useState("");

  const fileRef = useRef(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getBillboards();
      setBillboards(r.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // When editing opens, reconstruct dateSlots from stored timeSlots array
  useEffect(() => {
    if (!editing) {
      setDateSlots({}); setImagePreview(""); setImageFile(null); return;
    }
    if (editing.timeSlots?.length > 0) {
      // stored as "YYYY-MM-DD HH:MM-HH:MM"
      const rebuilt = {};
      editing.timeSlots.forEach(s => {
        const [date, time] = s.split(" ");
        if (!rebuilt[date]) rebuilt[date] = [];
        if (time) rebuilt[date].push(time);
      });
      setDateSlots(rebuilt);
    } else {
      setDateSlots({});
    }
    setImagePreview(editing.imageUrl ? `http://localhost:5000${editing.imageUrl}` : "");
  }, [editing]);

  // Flatten dateSlots → flat array for storage
  const flattenedSlots = () => {
    const result = [];
    Object.keys(dateSlots)
      .sort()
      .forEach(date => {
        dateSlots[date].forEach(time => {
          result.push(`${date} ${time}`);
        });
      });
    return result;
  };

  // Add a time slot to the currently selected date
  const addSlot = () => {
    if (!activeDate) { alert("Please select a date first."); return; }
    if (!slotStart || !slotEnd) { alert("Please set both start and end time."); return; }
    if (slotEnd <= slotStart) { alert("End time must be after start time."); return; }
    const slotStr = `${slotStart}-${slotEnd}`;
    setDateSlots(prev => {
      const existing = prev[activeDate] || [];
      if (existing.includes(slotStr)) return prev;
      return { ...prev, [activeDate]: [...existing, slotStr] };
    });
    setSlotStart(""); setSlotEnd("");
  };

  const removeSlot = (date, slotStr) => {
    setDateSlots(prev => {
      const updated = (prev[date] || []).filter(s => s !== slotStr);
      if (updated.length === 0) {
        const clone = { ...prev };
        delete clone[date];
        return clone;
      }
      return { ...prev, [date]: updated };
    });
  };

  const removeDate = (date) => {
    setDateSlots(prev => {
      const clone = { ...prev };
      delete clone[date];
      return clone;
    });
  };

  // Price validation against settings minimum
  const handlePriceChange = (val) => {
    setForm(p => ({ ...p, pricePerMinute: val }));
    const n = parseFloat(val);
    if (!isNaN(n) && n < minRate) {
      setPriceError(`Minimum rate is PKR ${minRate}/min (set in Settings → Payment Gateway)`);
    } else {
      setPriceError("");
    }
  };

  const handleImageFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please select an image file."); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.city || !form.location || !form.pricePerMinute) {
      alert("Please fill all required fields (Name, City, Location, Rate)");
      return;
    }
    const price = parseFloat(form.pricePerMinute);
    if (isNaN(price) || price < minRate) {
      alert(`Rate must be at least PKR ${minRate}/minute as set in your platform settings.`);
      return;
    }
    const slots = flattenedSlots();
    if (slots.length === 0) {
      alert("Please add at least one date with available time slots.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    // Send pricePerHour field for backward compat but label it as per-minute
    formData.append("pricePerHour", form.pricePerMinute); // stored as pricePerHour in DB
    formData.append("priceUnit", "per_minute");
    Object.keys(form).forEach(key => {
      if (key !== "pricePerMinute") formData.append(key, form[key]);
    });
    formData.append("timeSlots", JSON.stringify(slots));
    if (imageFile) formData.append("image", imageFile);

    try {
      if (editing) await updateBillboard(editing._id, formData);
      else await createBillboard(formData);
      setModalOpen(false);
      load();
    } catch (e) {
      console.error(e);
      alert("Failed to save billboard.");
    } finally {
      setSubmitting(false);
    }
  };

  const openCreate = () => {
    setEditing(null); setForm(EMPTY_FORM); setImagePreview(""); setImageFile(null);
    setDateSlots({}); setActiveDate(""); setSlotStart(""); setSlotEnd("");
    setPriceError("");
    setModalOpen(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      name: b.name, city: b.city, location: b.location, size: b.size,
      type: b.type, resolution: b.resolution,
      pricePerMinute: b.pricePerHour, // reading from DB
      status: b.status
    });
    setPriceError("");
    setActiveDate(""); setSlotStart(""); setSlotEnd("");
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently delete this billboard?")) return;
    try { await deleteBillboard(id); load(); } catch (e) { console.error(e); alert("Delete failed"); }
  };

  const toggleStatus = async (id, cur) => {
    try {
      const fd = new FormData();
      fd.append("status", cur === "active" ? "offline" : "active");
      await updateBillboard(id, fd);
      load();
    } catch (e) { console.error(e); }
  };

  const formatHeartbeat = (value) => {
    if (!value) return "Never connected";
    return new Date(value).toLocaleString("en-PK");
  };

  const getDevicePill = (displayConfig = {}) => {
    if (displayConfig?.onlineStatus === "online") {
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/25";
    }
    return "bg-slate-500/15 text-slate-300 border-slate-500/20";
  };

  const getDisplayUrl = (billboard) => {
    const apiBase = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;
    const token = billboard?.displayConfig?.deviceToken || "";
    return `${window.location.origin}/display-simulator.html?apiBase=${encodeURIComponent(apiBase)}&billboardId=${encodeURIComponent(billboard._id)}&token=${encodeURIComponent(token)}`;
  };

  const handleCopyDisplayUrl = async (billboard) => {
    try {
      await navigator.clipboard.writeText(getDisplayUrl(billboard));
      setCopiedId(billboard._id);
      setTimeout(() => setCopiedId(""), 1400);
    } catch (error) {
      console.error(error);
      alert("Could not copy display URL.");
    }
  };

  const handleOpenDisplay = (billboard) => {
    window.open(getDisplayUrl(billboard), "_blank", "noopener,noreferrer");
  };

  const handleRotateDeviceToken = async (billboardId) => {
    if (!window.confirm("Rotate this screen token? The old display URL will stop working until you copy the new one.")) return;
    setRotatingId(billboardId);
    try {
      await rotateBillboardDisplayToken(billboardId);
      await load();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Could not rotate the display token.");
    } finally {
      setRotatingId("");
    }
  };

  // ── All dates currently scheduled ────────────────────────────────────────
  const scheduledDates = Object.keys(dateSlots).sort();
  const totalSlots = flattenedSlots().length;

  return (
    <div className="flex flex-col gap-8 h-full bg-darkBg text-textMain relative pb-16">
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute w-[600px] h-[600px] bg-blue-600 opacity-5 blur-[120px] top-10 left-20 rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-black text-white">Billboard Database</h1>
            <p className="text-blue-100/60 mt-1">
              {billboards.length} registered displays ·{" "}
              <span className="text-cyan-400 font-medium">Min rate: PKR {minRate}/min</span>
            </p>
          </div>
          <button onClick={openCreate}
            className="bg-primary hover:bg-blue-600 border border-primary text-white rounded-xl px-5 py-3 font-medium flex items-center gap-2 transition shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transform hover:-translate-y-1">
            <Plus size={18} /> Add Billboard
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64 text-blue-400 animate-pulse font-bold text-xl">Syncing...</div>
        ) : billboards.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 bg-[#131A2A]/40 border border-white/5 border-dashed rounded-3xl">
            <Monitor size={48} className="text-blue-500/30 mb-4" />
            <p className="text-blue-200/50">No billboards yet. Click 'Add Billboard' to start.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {billboards.map(b => (
              <div key={b._id} className="bg-[#131A2A]/80 backdrop-blur-md border border-blue-500/10 rounded-2xl overflow-hidden hover:border-blue-500/40 transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.05)] hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] group flex flex-col">
                <div className="relative h-48 overflow-hidden bg-black/40 flex items-center justify-center">
                  {b.imageUrl ? (
                    <img src={`http://localhost:5000${b.imageUrl}`} alt={b.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105" />
                  ) : (
                    <Monitor size={48} className="text-white/10" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1C] via-transparent to-transparent opacity-90" />
                  <span className={`absolute top-4 right-4 text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border ${b.status === "active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : b.status === "maintenance" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
                    {b.status}
                  </span>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold text-white drop-shadow-md truncate">{b.name}</h3>
                    <p className="text-blue-200/70 text-sm flex items-center gap-1 mt-1 truncate">
                      <MapPin size={12} className="text-primary" /> {b.city}, {b.location}
                    </p>
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-blue-300 font-bold text-lg">
                      PKR {b.pricePerHour}
                      <span className="text-blue-200/50 text-sm font-normal"> / min</span>
                    </div>
                    <div className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded-md">{b.type}</div>
                  </div>

                  {/* Show dates with slot counts */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {(() => {
                      // Group stored slots by date
                      const grouped = {};
                      (b.timeSlots || []).forEach(s => {
                        const [d] = s.split(" ");
                        grouped[d] = (grouped[d] || 0) + 1;
                      });
                      return Object.keys(grouped).sort().slice(0, 4).map(d => (
                        <span key={d} className="bg-primary/10 border border-primary/20 text-blue-300 text-[10px] px-2 py-1 rounded shadow-sm">
                          {d.slice(5)} · {grouped[d]} slot{grouped[d] > 1 ? "s" : ""}
                        </span>
                      ));
                    })()}
                    {b.timeSlots?.length > 4 && <span className="text-xs text-blue-200/40 py-1">+more</span>}
                  </div>

                  <div className="mb-5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/70 mb-2 font-bold">Live Display</p>
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px]">
                      <span className={`rounded-full border px-2.5 py-1 font-bold uppercase tracking-[0.18em] ${getDevicePill(b.displayConfig)}`}>
                        {b.displayConfig?.onlineStatus || "offline"}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-bold uppercase tracking-[0.18em] text-blue-100/60">
                        {b.displayConfig?.screenCode || "No code"}
                      </span>
                    </div>
                    <div className="mb-3 space-y-1 text-[11px] text-blue-100/55">
                      <p>Device: {b.displayConfig?.deviceLabel || "Browser display bridge"}</p>
                      <p>Last seen: {formatHeartbeat(b.displayConfig?.lastHeartbeatAt)}</p>
                      <p>Arduino: {b.displayConfig?.arduinoConnected ? "Connected" : "Not connected"} · Browser: {b.displayConfig?.browserConnected ? "Connected" : "Not connected"}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenDisplay(b)}
                        className="flex-1 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 text-xs font-bold py-2 rounded-lg transition-colors flex justify-center items-center gap-2"
                      >
                        <ExternalLink size={13} /> Open Screen
                      </button>
                      <button
                        onClick={() => handleCopyDisplayUrl(b)}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-blue-100 text-xs font-bold py-2 rounded-lg transition-colors flex justify-center items-center gap-2"
                      >
                        <Copy size={13} /> {copiedId === b._id ? "Copied" : "Copy URL"}
                      </button>
                    </div>
                    <button
                      onClick={() => handleRotateDeviceToken(b._id)}
                      disabled={rotatingId === b._id}
                      className="mt-2 w-full bg-white/5 hover:bg-white/10 text-blue-100 text-xs font-bold py-2 rounded-lg transition-colors"
                    >
                      {rotatingId === b._id ? "Rotating..." : "Rotate Screen Token"}
                    </button>
                  </div>

                  <div className="mt-auto pt-4 border-t border-white/5 flex justify-between gap-2">
                    <button onClick={() => toggleStatus(b._id, b.status)} className="flex-1 bg-white/5 hover:bg-white/10 text-blue-200 text-xs font-bold py-2 rounded-lg transition-colors flex justify-center items-center gap-2">
                      <Power size={14} className={b.status === "active" ? "text-emerald-400" : "text-amber-400"} /> Toggle
                    </button>
                    <button onClick={() => openEdit(b)} className="bg-white/5 hover:bg-primary/20 text-blue-200 text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(b._id)} className="bg-danger/10 hover:bg-danger/30 text-danger text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── MODAL ──────────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {modalOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#0A0F1C]/85 backdrop-blur-md z-50 flex justify-center items-center p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-darkCard border border-blue-500/20 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-[0_0_60px_rgba(59,130,246,0.15)]">

                {/* Modal header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-darkBg/50 flex-shrink-0">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Monitor className="text-primary" /> {editing ? "Edit Billboard" : "Add New Billboard"}
                  </h2>
                  <button onClick={() => setModalOpen(false)} className="text-white/50 hover:text-white bg-white/5 p-2 rounded-full transition-colors"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                    {/* ── Left: Billboard Details ─────────────────────────── */}
                    <div className="flex flex-col gap-5">
                      <div>
                        <label className="text-xs font-bold text-blue-200/50 uppercase tracking-widest mb-1 block">Billboard Name *</label>
                        <input type="text" className="w-full bg-[#131A2A] border border-blue-500/20 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                          value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. DHA Phase 6 Mega Screen" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-blue-200/50 uppercase tracking-widest mb-1 block">City *</label>
                          <input type="text" className="w-full bg-[#131A2A] border border-blue-500/20 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                            value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="Karachi" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-blue-200/50 uppercase tracking-widest mb-1 block">Location / Sector *</label>
                          <input type="text" className="w-full bg-[#131A2A] border border-blue-500/20 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                            value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Sector Y, Block 5" />
                        </div>
                      </div>

                      {/* Rate per MINUTE with min validation */}
                      <div>
                        <label className="text-xs font-bold text-blue-200/50 uppercase tracking-widest mb-1 block">
                          Rate (PKR / minute) * &nbsp;
                          <span className="text-cyan-400 font-bold normal-case">Min: PKR {minRate}/min</span>
                        </label>
                        <div className="relative">
                          <input type="number" min={minRate} step="0.5"
                            className={`w-full bg-[#131A2A] border text-white rounded-xl px-4 py-3 focus:outline-none transition-colors pr-20 ${priceError ? "border-red-500/60 focus:border-red-500" : "border-blue-500/20 focus:border-blue-500"}`}
                            value={form.pricePerMinute} onChange={e => handlePriceChange(e.target.value)} placeholder={`Min ${minRate}`} />
                          <span className="absolute right-4 top-3.5 text-blue-200/40 text-sm font-bold">PKR/min</span>
                        </div>
                        {priceError && (
                          <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{priceError}</p>
                        )}
                        {form.pricePerMinute && !priceError && (
                          <p className="text-blue-200/40 text-xs mt-1">
                            ≈ PKR {(parseFloat(form.pricePerMinute) * 60).toLocaleString()}/hour
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-blue-200/50 uppercase tracking-widest mb-1 block">Operating Status</label>
                          <select className="w-full bg-[#131A2A] border border-blue-500/20 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                            value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                            <option value="active">🟢 Active</option>
                            <option value="maintenance">🟠 Maintenance</option>
                            <option value="offline">🔴 Offline</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-blue-200/50 uppercase tracking-widest mb-1 block">Type</label>
                          <select className="w-full bg-[#131A2A] border border-blue-500/20 text-white rounded-xl px-3 py-3 focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                            value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                            {typeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-blue-200/50 uppercase tracking-widest mb-1 block">Size</label>
                          <select className="w-full bg-[#131A2A] border border-blue-500/20 text-white rounded-xl px-3 py-3 focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                            value={form.size} onChange={e => setForm(p => ({ ...p, size: e.target.value }))}>
                            {sizeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-blue-200/50 uppercase tracking-widest mb-1 block">Resolution</label>
                          <select className="w-full bg-[#131A2A] border border-blue-500/20 text-white rounded-xl px-3 py-3 focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                            value={form.resolution} onChange={e => setForm(p => ({ ...p, resolution: e.target.value }))}>
                            {resolutionOpts.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Image Upload */}
                      <div>
                        <label className="text-xs font-bold text-blue-200/50 uppercase tracking-widest mb-2 block">Billboard Image</label>
                        <div onClick={() => fileRef.current?.click()}
                          className="border-2 border-dashed border-blue-500/30 rounded-2xl p-2 h-40 bg-[#131A2A]/50 hover:bg-[#131A2A] hover:border-blue-500/60 transition-all cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group">
                          {imagePreview ? (
                            <>
                              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <p className="text-white font-bold flex items-center gap-2"><Upload size={18} /> Replace Image</p>
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center text-blue-300/50 group-hover:text-blue-400 transition-colors">
                              <Upload size={28} className="mb-2" />
                              <p className="font-bold text-sm">Click to browse</p>
                              <p className="text-xs mt-1 opacity-60">.jpg .png .webp (max 5MB)</p>
                            </div>
                          )}
                          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                        </div>
                      </div>
                    </div>

                    {/* ── Right: Per-Date Slot Builder ─────────────────────── */}
                    <div className="flex flex-col gap-4">
                      <div className="bg-[#131A2A]/80 border border-blue-500/20 rounded-2xl p-6 shadow-[0_0_20px_rgba(59,130,246,0.05)]">
                        <div className="border-b border-white/5 pb-4 mb-5 flex items-center gap-3">
                          <Calendar className="text-primary" />
                          <div>
                            <h4 className="text-white font-bold">Per-Date Availability Builder</h4>
                            <p className="text-[10px] text-blue-200/50 uppercase tracking-widest">Each date gets its own independent time slots</p>
                          </div>
                        </div>

                        {/* Date + time inputs */}
                        <div className="bg-[#0A0F1C]/60 border border-blue-500/10 rounded-xl p-4 mb-4">
                          <div className="mb-3">
                            <label className="text-xs font-bold text-blue-200/60 mb-1.5 block">Step 1 — Pick a Date</label>
                            <div className="relative">
                              <input type="date" value={activeDate} onChange={e => setActiveDate(e.target.value)}
                                className="w-full bg-[#131A2A] border border-blue-500/30 text-white rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 [color-scheme:dark]" />
                              <Calendar size={15} className="absolute left-3 top-3 text-blue-400 pointer-events-none" />
                            </div>
                          </div>

                          <div className="mb-3">
                            <label className="text-xs font-bold text-blue-200/60 mb-1.5 block">Step 2 — Set Time Slot for this Date</label>
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <input type="time" value={slotStart} onChange={e => setSlotStart(e.target.value)}
                                  className="w-full bg-[#131A2A] border border-blue-500/30 text-white rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 [color-scheme:dark]" />
                                <Clock size={14} className="absolute left-3 top-3 text-blue-400 pointer-events-none" />
                              </div>
                              <span className="text-blue-200/50 font-bold">→</span>
                              <div className="relative flex-1">
                                <input type="time" value={slotEnd} onChange={e => setSlotEnd(e.target.value)}
                                  className="w-full bg-[#131A2A] border border-blue-500/30 text-white rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 [color-scheme:dark]" />
                                <Clock size={14} className="absolute left-3 top-3 text-blue-400 pointer-events-none" />
                              </div>
                            </div>
                          </div>

                          <button onClick={addSlot}
                            className="w-full bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/50 transition-colors rounded-lg py-2 text-sm font-bold flex justify-center items-center gap-2">
                            <Plus size={15} /> Add Slot to {activeDate || "Selected Date"}
                          </button>
                        </div>

                        {/* Per-date slot board */}
                        <div className="max-h-72 overflow-y-auto flex flex-col gap-3">
                          {scheduledDates.length === 0 ? (
                            <div className="text-center py-8 text-white/20 border border-dashed border-white/5 rounded-xl text-sm">
                              No dates scheduled yet. Pick a date and add time slots above.
                            </div>
                          ) : scheduledDates.map(date => (
                            <div key={date} className="bg-[#0A0F1C]/40 border border-white/5 rounded-xl overflow-hidden">
                              {/* Date header */}
                              <div className="flex justify-between items-center px-4 py-2.5 bg-blue-500/10 border-b border-white/5">
                                <span className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                                  <Calendar size={14} className="text-cyan-400" /> {date}
                                  <span className="text-[10px] text-blue-200/40 font-normal ml-1">
                                    ({dateSlots[date]?.length || 0} slot{dateSlots[date]?.length !== 1 ? "s" : ""})
                                  </span>
                                </span>
                                <button onClick={() => removeDate(date)} className="text-red-400/40 hover:text-red-400 transition-colors text-xs font-bold flex items-center gap-1">
                                  <X size={13} /> Remove Date
                                </button>
                              </div>
                              {/* Slots for this date */}
                              <div className="p-3 flex flex-wrap gap-2">
                                {(dateSlots[date] || []).map(slot => (
                                  <div key={slot} className="flex items-center gap-1 bg-blue-900/20 border border-blue-500/20 rounded-lg px-3 py-1.5 group">
                                    <Clock size={12} className="text-primary" />
                                    <span className="text-blue-200 text-xs font-medium">{slot}</span>
                                    <button onClick={() => removeSlot(date, slot)} className="ml-1 text-red-400/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                      <X size={11} />
                                    </button>
                                  </div>
                                ))}
                                {/* Quick-add to this specific date */}
                                <button onClick={() => setActiveDate(date)}
                                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-colors ${activeDate === date ? "bg-blue-500/30 border-blue-500/60 text-blue-300" : "bg-white/5 border-white/10 text-white/30 hover:text-blue-300 hover:border-blue-500/30"}`}>
                                  {activeDate === date ? "✓ Editing" : "+ Add slot"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Summary */}
                      {totalSlots > 0 && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-4 flex items-center gap-3">
                          <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                          <p className="text-sm font-bold text-emerald-300">
                            {scheduledDates.length} date{scheduledDates.length !== 1 ? "s" : ""} · {totalSlots} total slot{totalSlots !== 1 ? "s" : ""} configured
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-darkBg/50 flex justify-between items-center flex-shrink-0">
                  <p className="text-xs text-blue-200/40">
                    {totalSlots > 0
                      ? `${scheduledDates.length} date(s) · ${totalSlots} slot(s) ready`
                      : "Add at least one time slot to publish"}
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setModalOpen(false)} className="px-6 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors">Cancel</button>
                    <button onClick={handleSubmit} disabled={submitting || !!priceError}
                      className="bg-primary hover:bg-blue-600 border border-primary text-white text-sm font-bold px-8 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50">
                      {submitting ? "Saving..." : editing ? "Save Changes" : "Deploy Billboard"}
                    </button>
                  </div>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

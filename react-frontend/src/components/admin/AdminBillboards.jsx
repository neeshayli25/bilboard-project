import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Edit, Trash2, Power, MapPin, Monitor, Calendar, X, Upload, Image as ImageIcon } from "lucide-react";
import { getBillboards, createBillboard, updateBillboard, deleteBillboard } from "../../services/adminApi";

const sizeOptions     = ["10ft x 20ft", "14ft x 48ft", "8ft x 16ft", "12ft x 30ft", "Custom"];
const typeOptions     = ["Digital LED", "LCD", "Static", "Neon"];
const resolutionOpts  = ["1920x1080", "2560x1440", "3840x2160", "1280x720", "Other"];
const daysOfWeek      = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const timeSlotOptions = [
  { label: "Morning (09:00–12:00)",    value: "09:00-12:00" },
  { label: "Afternoon (12:00–15:00)",  value: "12:00-15:00" },
  { label: "Evening (15:00–18:00)",    value: "15:00-18:00" },
  { label: "Night (18:00–21:00)",      value: "18:00-21:00" },
  { label: "Late Night (21:00–00:00)", value: "21:00-00:00" },
];

const EMPTY_FORM = {
  name: "", city: "", location: "", size: "", type: "Digital LED",
  resolution: "1920x1080", pricePerHour: "", status: "active",
  imageUrl: "", easypaisaNumber: "", timeSlots: []
};

const inputStyle = {
  border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px",
  fontSize: 14, outline: "none", width: "100%", background: "#fff",
  transition: "border .15s", boxSizing: "border-box"
};

export default function AdminBillboards() {
  const [billboards, setBillboards] = useState([]);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [selectedDays, setSelectedDays]   = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [imagePreview, setImagePreview]   = useState("");
  const [imageFile, setImageFile]         = useState(null);
  const fileRef = useRef();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const r = await getBillboards(); setBillboards(r.data); }
    catch (e) { console.error(e); alert("Failed to load billboards"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!editing?.timeSlots) { setSelectedDays([]); setSelectedSlots([]); setImagePreview(""); setImageFile(null); return; }
    const days = new Set(), slots = new Set();
    editing.timeSlots.forEach(s => { const [d, ...rest] = s.split(" "); days.add(d); slots.add(rest.join(" ")); });
    setSelectedDays([...days]);
    setSelectedSlots([...slots]);
    setImagePreview(editing.imageUrl || "");
  }, [editing]);

  const toggleDay  = d  => setSelectedDays(p  => p.includes(d)  ? p.filter(x => x !== d)  : [...p, d]);
  const toggleSlot = sv => setSelectedSlots(p => p.includes(sv) ? p.filter(x => x !== sv) : [...p, sv]);

  const buildSlots = () => selectedDays.flatMap(d => selectedSlots.map(s => `${d} ${s}`));

  const handleImageFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (JPEG, PNG, GIF, WEBP)");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
    // For backend: we need to upload the file separately.
    // For now, we'll store the base64 URL (but can be large).
    // Better to have an upload endpoint. We'll keep as base64 for simplicity.
    setForm(f => ({ ...f, imageUrl: reader.result }));
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!form.name || !form.city || !form.location || !form.pricePerHour || !form.easypaisaNumber) {
      alert("Please fill all required fields (Name, City, Location, Price, Easypaisa Number)");
      return;
    }
    const payload = { ...form, timeSlots: buildSlots() };
    // If we have a new image file but not yet converted to base64, we need to wait
    if (imageFile && !payload.imageUrl) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        payload.imageUrl = reader.result;
        await submit(payload);
      };
      reader.readAsDataURL(imageFile);
      return;
    }
    await submit(payload);
  };

  const submit = async (payload) => {
    setSubmitting(true);
    try {
      if (editing) await updateBillboard(editing._id, payload);
      else         await createBillboard(payload);
      setModalOpen(false);
      load();
    } catch (e) {
      console.error(e);
      alert("Failed to save billboard. Check console.");
    } finally {
      setSubmitting(false);
    }
  };

  const openCreate = () => {
    setEditing(null); setForm(EMPTY_FORM); setImagePreview(""); setImageFile(null);
    setSelectedDays([]); setSelectedSlots([]);
    setModalOpen(true);
  };

  const openEdit = (b) => {
    setEditing(b); setForm(b); setImagePreview(b.imageUrl || ""); setImageFile(null);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this billboard? This action cannot be undone.")) return;
    try {
      await deleteBillboard(id);
      load();
    } catch (e) {
      console.error(e);
      alert("Delete failed");
    }
  };

  const toggleStatus = async (id, cur) => {
    try {
      await updateBillboard(id, { status: cur === "active" ? "offline" : "active" });
      load();
    } catch (e) {
      console.error(e);
      alert("Status update failed");
    }
  };

  return (
    <div style={{ fontFamily: "inherit" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a" }}>Billboard Management</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>{billboards.length} billboards registered</p>
        </div>
        <button
          onClick={openCreate}
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: 12, padding: "11px 22px", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}
        >
          <Plus size={18} /> Add Billboard
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#6366f1", fontWeight: 600 }}>Loading...</div>
      ) : billboards.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", background: "#f8faff", borderRadius: 20, border: "1px dashed #c7d2fe" }}>
          <Monitor size={48} color="#c7d2fe" style={{ margin: "0 auto 12px" }} />
          <p style={{ color: "#64748b", fontSize: 15 }}>No billboards yet. Click "Add Billboard" to start.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 20 }}>
          {billboards.map(b => (
            <div key={b._id} style={{ background: "#fff", borderRadius: 18, border: "1px solid #e8edf5", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", transition: "all .2s" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 8px 28px rgba(99,102,241,0.12)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)"}>
              <div style={{ position: "relative", height: 160 }}>
                <img
                  src={b.imageUrl || `https://picsum.photos/seed/${b._id}/300/200`}
                  alt={b.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={e => { e.target.src = "https://picsum.photos/300/200"; }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)" }} />
                <span style={{ position: "absolute", top: 10, right: 10, background: b.status === "active" ? "#10b981" : "#94a3b8", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>
                  {b.status.toUpperCase()}
                </span>
                <p style={{ position: "absolute", bottom: 10, left: 12, color: "#fff", fontWeight: 800, fontSize: 16, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{b.name}</p>
              </div>
              <div style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 13, color: "#64748b" }}><MapPin size={13} color="#6366f1" /> {b.city}, {b.location}</div>
                  <div style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 13, color: "#64748b" }}><Monitor size={13} color="#6366f1" /> {b.type} · {b.resolution}</div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#6366f1" }}>PKR {b.pricePerHour}<span style={{ fontSize: 12, fontWeight: 400, color: "#94a3b8" }}>/hr</span></div>
                  {b.easypaisaNumber && <div style={{ fontSize: 12, color: "#64748b" }}>📱 Easypaisa: {b.easypaisaNumber}</div>}
                </div>
                {b.timeSlots?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                    {b.timeSlots.slice(0, 3).map(s => (
                      <span key={s} style={{ background: "#eef2ff", color: "#6366f1", fontSize: 10, padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>{s}</span>
                    ))}
                    {b.timeSlots.length > 3 && <span style={{ fontSize: 11, color: "#94a3b8" }}>+{b.timeSlots.length - 3} more</span>}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                  {[
                    { icon: Edit,  color: "#6366f1", hover: "#eef2ff", onClick: () => openEdit(b), title: "Edit" },
                    { icon: Power, color: b.status === "active" ? "#f59e0b" : "#10b981", hover: b.status === "active" ? "#fffbeb" : "#f0fdf4", onClick: () => toggleStatus(b._id, b.status), title: "Toggle" },
                    { icon: Trash2, color: "#ef4444", hover: "#fef2f2", onClick: () => handleDelete(b._id), title: "Delete" },
                  ].map(btn => (
                    <button key={btn.title} onClick={btn.onClick} title={btn.title}
                      style={{ padding: "7px", borderRadius: 9, border: "none", cursor: "pointer", background: "transparent", color: btn.color, transition: "background .15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = btn.hover}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <btn.icon size={16} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}
            onClick={() => setModalOpen(false)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}
              style={{ background: "#fff", borderRadius: 20, maxWidth: 720, width: "100%", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}
              onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div style={{ position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #f1f5f9", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 1, borderRadius: "20px 20px 0 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ background: "#eef2ff", borderRadius: 10, padding: 8 }}><Monitor size={18} color="#6366f1" /></div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{editing ? "Edit Billboard" : "Add New Billboard"}</h2>
                </div>
                <button onClick={() => setModalOpen(false)} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: 7, cursor: "pointer", color: "#64748b" }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Image Upload */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>Billboard Image</label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    style={{ border: "2px dashed #c7d2fe", borderRadius: 14, padding: "20px", textAlign: "center", cursor: "pointer", background: "#f8faff", transition: "border .15s", position: "relative", overflow: "hidden" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#6366f1"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#c7d2fe"}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="preview" style={{ maxHeight: 160, borderRadius: 10, objectFit: "cover", width: "100%" }} />
                    ) : (
                      <div>
                        <Upload size={32} color="#c7d2fe" style={{ margin: "0 auto 8px" }} />
                        <p style={{ fontSize: 14, color: "#6366f1", fontWeight: 600 }}>Click to upload from gallery</p>
                        <p style={{ fontSize: 12, color: "#94a3b8" }}>PNG, JPG, WEBP up to 5MB</p>
                      </div>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageFile} />
                  </div>
                  {imagePreview && (
                    <button onClick={() => { setImagePreview(""); setImageFile(null); setForm(f => ({ ...f, imageUrl: "" })); }}
                      style={{ marginTop: 6, fontSize: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>
                      Remove image
                    </button>
                  )}
                </div>

                {/* Basic Info */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { key: "name",     placeholder: "Billboard Name *" },
                    { key: "city",     placeholder: "City *" },
                  ].map(f => (
                    <input key={f.key} type="text" placeholder={f.placeholder} style={inputStyle}
                      value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      onFocus={e => e.target.style.borderColor = "#6366f1"}
                      onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                  ))}
                </div>
                <input type="text" placeholder="Location (Street / Area) *" style={inputStyle}
                  value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = "#6366f1"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {[
                    { key: "size",       opts: sizeOptions,    label: "Size" },
                    { key: "type",       opts: typeOptions,    label: "Type" },
                    { key: "resolution", opts: resolutionOpts, label: "Resolution" },
                  ].map(sel => (
                    <select key={sel.key} style={{ ...inputStyle, background: "#fafbff" }}
                      value={form[sel.key]} onChange={e => setForm(p => ({ ...p, [sel.key]: e.target.value }))}>
                      <option value="">{sel.label}</option>
                      {sel.opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <input type="number" placeholder="Price per Hour (PKR) *" style={inputStyle}
                    value={form.pricePerHour} onChange={e => setForm(p => ({ ...p, pricePerHour: e.target.value }))}
                    onFocus={e => e.target.style.borderColor = "#6366f1"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                  <input type="text" placeholder="Easypaisa Number *" style={inputStyle}
                    value={form.easypaisaNumber} onChange={e => setForm(p => ({ ...p, easypaisaNumber: e.target.value }))}
                    onFocus={e => e.target.style.borderColor = "#6366f1"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </div>

                <select style={{ ...inputStyle, background: "#fafbff" }}
                  value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="offline">Offline</option>
                  <option value="maintenance">Maintenance</option>
                </select>

                {/* Days */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 10 }}>Available Days</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {daysOfWeek.map(d => (
                      <button key={d} type="button" onClick={() => toggleDay(d)}
                        style={{ padding: "8px 16px", borderRadius: 30, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", transition: "all .15s",
                          background: selectedDays.includes(d) ? "#6366f1" : "#f1f5f9",
                          color: selectedDays.includes(d) ? "#fff" : "#64748b" }}>
                        {d.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Slots */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 10 }}>Time Slots</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {timeSlotOptions.map(slot => (
                      <button key={slot.value} type="button" onClick={() => toggleSlot(slot.value)}
                        style={{ padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", transition: "all .15s",
                          background: selectedSlots.includes(slot.value) ? "#4f46e5" : "#eef2ff",
                          color: selectedSlots.includes(slot.value) ? "#fff" : "#4338ca" }}>
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generated Slots Preview */}
                {buildSlots().length > 0 && (
                  <div style={{ background: "#f8faff", borderRadius: 12, padding: 16, border: "1px solid #e0e7ff" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", marginBottom: 10 }}>✅ Generated Time Slots ({buildSlots().length})</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {buildSlots().map((s, i) => (
                        <span key={i} style={{ background: "#e0e7ff", color: "#4338ca", fontSize: 11, padding: "4px 10px", borderRadius: 20, fontWeight: 600 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
                  <button onClick={() => setModalOpen(false)} disabled={submitting}
                    style={{ padding: "10px 22px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button onClick={handleSubmit} disabled={submitting}
                    style={{ padding: "10px 28px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,.35)", opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? "Saving..." : (editing ? "Update Billboard" : "Create Billboard")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
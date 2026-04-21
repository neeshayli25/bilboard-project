import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Image as ImageIcon, CheckCircle, XCircle, Clock, RefreshCw, Edit, Save, X } from "lucide-react";
import { getMyAdsAdvertiser, updateAd } from "../../api";

export default function MyAds() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [editingAd, setEditingAd] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", duration: 30 });
  const [editFile, setEditFile] = useState(null);
  const [editPreview, setEditPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const res = await getMyAdsAdvertiser();
      setAds(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAds = ads.filter(ad => filter === "all" || ad.approvalStatus === filter);

  const getStatusBadge = (status) => {
    const config = {
      approved: { icon: CheckCircle, color: "green", text: "Approved" },
      rejected: { icon: XCircle, color: "red", text: "Rejected" },
      pending: { icon: Clock, color: "yellow", text: "Pending" },
    };
    const { icon: Icon, color, text } = config[status] || config.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${color}-100 text-${color}-700`}>
        <Icon size={12} /> {text}
      </span>
    );
  };

  const openEditModal = (ad) => {
    setEditingAd(ad);
    setEditForm({ title: ad.title, description: ad.description, duration: ad.duration || 30 });
    setEditPreview(null);
    setEditFile(null);
  };

  const closeEditModal = () => {
    setEditingAd(null);
    setEditFile(null);
    setEditPreview(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData();
    formData.append("title", editForm.title);
    formData.append("description", editForm.description);
    formData.append("duration", editForm.duration);
    if (editFile) formData.append("media", editFile);
    try {
      await updateAd(editingAd._id, formData);
      fetchAds();
      closeEditModal();
    } catch (err) {
      console.error(err);
      alert("Update failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading your ads...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Advertisements</h1>
          <p className="text-gray-500 mt-1">Manage and track your uploaded ads</p>
        </div>
        <button onClick={fetchAds} className="p-2 text-gray-500 hover:text-indigo-600 transition">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {["all", "pending", "approved", "rejected"].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium transition-all ${
              filter === status ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {ads.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <ImageIcon size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No ads uploaded yet.</p>
          <button className="mt-2 text-indigo-600 hover:underline">Upload your first ad</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAds.map(ad => (
            <div key={ad._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
              {/* Media preview */}
              <div className="h-48 bg-gray-100 overflow-hidden relative">
                {ad.mediaType === "image" ? (
                  <img src={`${(import.meta.env.VITE_API_URL || "/api").replace(/\/api$/, "")}${ad.mediaUrl}`} alt={ad.title} className="w-full h-full object-cover" />
                ) : (
                  <video src={`${(import.meta.env.VITE_API_URL || "/api").replace(/\/api$/, "")}${ad.mediaUrl}`} className="w-full h-full object-cover" muted />
                )}
                <button
                  onClick={() => window.open(`${(import.meta.env.VITE_API_URL || "/api").replace(/\/api$/, "")}${ad.mediaUrl}`, "_blank")}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition"
                >
                  <Eye size={32} className="text-white" />
                </button>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">{ad.title}</h3>
                  {getStatusBadge(ad.approvalStatus)}
                </div>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{ad.description}</p>
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>Uploaded: {new Date(ad.createdAt).toLocaleDateString()}</span>
                  <span>{ad.mediaType === "image" ? "Image" : "Video"} • {ad.duration || 30}s</span>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => openEditModal(ad)} className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1">
                    <Edit size={14} /> Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingAd && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeEditModal}>
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center">
                <h3 className="font-semibold">Edit Ad</h3>
                <button onClick={closeEditModal} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full border rounded-lg p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    rows="3"
                    value={editForm.description}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full border rounded-lg p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration (seconds)</label>
                  <input
                    type="number"
                    value={editForm.duration}
                    onChange={e => setEditForm({ ...editForm, duration: parseInt(e.target.value) })}
                    min="5"
                    max="120"
                    className="w-full border rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Replace Media (optional)</label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file) {
                        setEditFile(file);
                        setEditPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="w-full border rounded-lg p-2"
                  />
                  {editPreview && (
                    <div className="mt-2">
                      {editFile?.type.startsWith("image/") ? (
                        <img src={editPreview} alt="Preview" className="max-h-32 rounded" />
                      ) : (
                        <video src={editPreview} controls className="max-h-32 rounded" />
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  <Save size={16} /> {submitting ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { uploadAd } from "../../api";

export default function UploadAd() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(30);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/mov", "video/avi"];
  const maxSize = 50 * 1024 * 1024; // 50MB

  const validateFile = (file) => {
    if (!allowedTypes.includes(file.type)) {
      setError("Only images (JPEG, PNG, GIF, WEBP) or videos (MP4, MOV, AVI) are allowed");
      return false;
    }
    if (file.size > maxSize) {
      setError("File size must be less than 50MB");
      return false;
    }
    return true;
  };

  const handleFileChange = (selected) => {
    if (!selected) return;
    if (!validateFile(selected)) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileChange(droppedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !file) {
      setError("Please fill all fields and select a file");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("duration", duration);
    formData.append("media", file);
    try {
      await uploadAd(formData);
      setSuccess("Ad uploaded successfully! It will be reviewed by admin.");
      setTitle("");
      setDescription("");
      setDuration(30);
      removeFile();
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto h-full px-4 md:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white">Upload Advertisement</h1>
        <p className="text-textMuted mt-2 text-sm">Create a new ad for your campaign, ready to be scheduled to any billboard.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-darkCard rounded-2xl shadow-xl border border-white/5 p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-textMuted mb-2 ml-1">Ad Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-darkBg border border-white/10 rounded-xl text-white outline-none focus:border-primary transition"
            placeholder="e.g., Summer Sale 2026"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-textMuted mb-2 ml-1">Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
            className="w-full px-4 py-3 bg-darkBg border border-white/10 rounded-xl text-white outline-none focus:border-primary transition"
            placeholder="Describe your advertisement..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-textMuted mb-2 ml-1">Duration (seconds)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            min="5"
            max="120"
            className="w-full px-4 py-3 bg-darkBg border border-white/10 rounded-xl text-white outline-none focus:border-primary transition"
          />
          <p className="text-xs text-textMuted mt-2 ml-1">Between 5 and 120 seconds</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-textMuted mb-2 ml-1">Media File *</label>
          <div
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging ? "border-primary bg-primary/10" : "border-white/10 hover:border-primary/50 bg-darkBg/50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files[0])}
            />
            {preview ? (
              <div className="relative inline-block">
                {file?.type.startsWith("image/") ? (
                  <img src={preview} alt="Preview" className="max-h-60 mx-auto rounded-xl shadow-lg border border-white/10" />
                ) : (
                  <video src={preview} controls className="max-h-60 mx-auto rounded-xl shadow-lg border border-white/10" />
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(); }}
                  className="absolute -top-3 -right-3 bg-danger text-white rounded-full p-1.5 shadow-lg hover:scale-110 transition"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="space-y-4 py-6">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-primary">
                  <Upload size={28} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white mb-1">Click or drag & drop to upload</p>
                  <p className="text-xs text-textMuted">PNG, JPG, GIF, WEBP, MP4, MOV, AVI (Max 50MB)</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 p-4 bg-danger/10 border border-danger/30 rounded-xl text-danger text-sm"
            >
              <AlertCircle size={18} />
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 p-4 bg-success/10 border border-success/30 rounded-xl text-success text-sm"
            >
              <CheckCircle size={18} />
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white font-medium py-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 mt-4"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
          {loading ? "Uploading..." : "Upload Advertisement"}
        </motion.button>
      </form>
    </div>
  );
}
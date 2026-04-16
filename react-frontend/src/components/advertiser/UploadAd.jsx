import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Video, Image as ImageIcon, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
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
      // Reset form
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
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Upload Advertisement</h1>
        <p className="text-gray-500 mt-1">Create a new ad for your campaign</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ad Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            placeholder="e.g., Summer Sale 2025"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            placeholder="Describe your advertisement..."
            required
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (seconds)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            min="5"
            max="120"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          />
          <p className="text-xs text-gray-500 mt-1">Between 5 and 120 seconds</p>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Media File *</label>
          <div
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300 hover:border-indigo-400"
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
              <div className="relative">
                {file?.type.startsWith("image/") ? (
                  <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg shadow-sm" />
                ) : (
                  <video src={preview} controls className="max-h-48 mx-auto rounded-lg shadow-sm" />
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(); }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="text-sm text-gray-600">Click or drag & drop to upload</p>
                <p className="text-xs text-gray-400">PNG, JPG, GIF, WEBP, MP4, MOV, AVI up to 50MB</p>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm"
            >
              <CheckCircle size={16} />
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          {loading ? "Uploading..." : "Upload Advertisement"}
        </button>
      </form>
    </div>
  );
}
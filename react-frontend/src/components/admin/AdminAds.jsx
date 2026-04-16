import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  Clock,
  Image as ImageIcon,
  Video,
  ChevronDown,
} from "lucide-react";
import { getAllAds, approveAd, rejectAd, deleteAd } from "../../services/adminApi";

const AdminAds = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewAd, setPreviewAd] = useState(null);
  const [mediaUrl, setMediaUrl] = useState("");

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    setLoading(true);
    try {
      const res = await getAllAds();
      setAds(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    await approveAd(id);
    loadAds();
  };

  const handleReject = async (id) => {
    await rejectAd(id);
    loadAds();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this ad?")) {
      await deleteAd(id);
      loadAds();
    }
  };

  const previewAdHandler = (ad) => {
    setPreviewAd(ad);
    setMediaUrl(`${API_BASE}${ad.mediaUrl}`);
    setPreviewMode(true);
  };

  const closePreview = () => {
    setPreviewMode(false);
    setPreviewAd(null);
    setMediaUrl("");
  };

  // Filtering
  const filteredAds = ads.filter((ad) => {
    const matchesSearch = ad.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (ad.campaign?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || ad.approvalStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Mock time slots – replace with real data later
  const timeSlots = [
    { day: "Monday", slots: 5 },
    { day: "Tuesday", slots: 3 },
    { day: "Wednesday", slots: 7 },
    { day: "Thursday", slots: 4 },
    { day: "Friday", slots: 6 },
    { day: "Saturday", slots: 8 },
    { day: "Sunday", slots: 2 },
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="min-h-screen bg-blue-400 text-gray-800 p-6">
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="mb-8"
      >
        <h1 className="text-5xl font-extrabold text-blue-950 drop-shadow-lg">Ad Pulse</h1>
        <p className="text-blue-800 mt-2 text-lg">Manage incoming ads & available slots</p>
      </motion.div>

      {/* Search & Filter Bar */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8 bg-blue-900 rounded-2xl p-5 border border-blue-950 shadow-md"
      >
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5" />
            <input
              type="text"
              placeholder="Search ads or campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-blue-200 border border-blue-300 rounded-xl text-gray-800 placeholder-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-5 py-4 bg-blue-200 hover:bg-blue-300 rounded-xl flex items-center gap-2 transition-all text-blue-900"
          >
            <Filter className="w-5 h-5" />
            Filter
            <ChevronDown className={`w-4 h-4 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-4 pt-4 border-t border-blue-700"
            >
              <div className="flex gap-3">
                {["all", "pending", "approved", "rejected"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-lg capitalize font-medium ${
                      filterStatus === status
                        ? "bg-blue-600 text-white"
                        : "bg-blue-800 text-blue-200 hover:bg-blue-700"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Ads List */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-2 space-y-4"
        >
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-blue-900">
            <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
            {previewMode ? "Preview Mode" : `All Ads (${filteredAds.length})`}
          </h2>

          {loading && !previewMode && <div className="text-center py-8 text-blue-800">Loading ads...</div>}

          <AnimatePresence mode="wait">
            {previewMode && previewAd ? (
              // Preview mode
              <motion.div
                key={previewAd._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-blue-200 rounded-2xl p-5 border border-blue-300 shadow-md"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-blue-900">{previewAd.title} - Preview</h3>
                  <button onClick={closePreview} className="text-blue-700 hover:text-blue-900">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  {previewAd.mediaType === "video" ? (
                    <video src={mediaUrl} controls autoPlay onEnded={closePreview} className="w-full h-full object-contain" />
                  ) : (
                    <img src={mediaUrl} alt={previewAd.title} className="w-full h-full object-contain" />
                  )}
                </div>
                <p className="mt-3 text-sm text-blue-800">Preview will close automatically when video ends.</p>
              </motion.div>
            ) : (
              // List of ads
              filteredAds.map((ad) => (
                <motion.div
                  key={ad._id}
                  variants={itemVariants}
                  layout
                  exit={{ opacity: 0, x: -100 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="bg-blue-200 rounded-2xl p-5 border border-blue-300 shadow-md transition-all"
                >
                  <div className="flex flex-wrap gap-4 justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-blue-900">{ad.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          ad.approvalStatus === 'approved' ? 'bg-green-200 text-green-900 border border-green-400' :
                          ad.approvalStatus === 'rejected' ? 'bg-red-200 text-red-900 border border-red-400' :
                          'bg-yellow-200 text-yellow-900 border border-yellow-400'
                        }`}>
                          {ad.approvalStatus}
                        </span>
                      </div>
                      <p className="text-sm text-blue-800 mb-2">{ad.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-blue-800">
                        <div className="flex items-center gap-1">
                          {ad.mediaType === 'video' ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                          {ad.mediaType}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Upload: {new Date(ad.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {ad.duration ? `${ad.duration}s` : 'N/A'}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-blue-700">Advertiser: {ad.advertiser?.name || 'Unknown'}</div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleApprove(ad._id)}
                        className="p-2 bg-green-600 hover:bg-green-700 rounded-lg text-white"
                        title="Approve"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleReject(ad._id)}
                        className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
                        title="Reject"
                      >
                        <XCircle className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => previewAdHandler(ad)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(ad._id)}
                        className="p-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white"
                        title="Delete"
                      >
                        <XCircle className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>

          {!previewMode && !loading && filteredAds.length === 0 && (
            <div className="text-center py-8 text-blue-800">No ads found.</div>
          )}
        </motion.div>

        {/* Right Column: Available Slots (mock, replace with real data later) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-blue-900 rounded-2xl p-5 border border-blue-950 shadow-md">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-blue-100">
              <span className="w-2 h-8 bg-blue-300 rounded-full"></span>
              Available Slots
            </h2>
            <div className="space-y-3">
              {timeSlots.map((slot) => (
                <motion.div
                  key={slot.day}
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.5 }}
                  className="flex items-center gap-3"
                >
                  <span className="w-24 text-blue-200">{slot.day}</span>
                  <div className="flex-1 h-8 bg-blue-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(slot.slots / 8) * 100}%` }}
                      transition={{ delay: 0.2, duration: 0.8 }}
                      className="h-full bg-blue-300 rounded-full"
                    />
                  </div>
                  <span className="text-sm font-bold text-blue-200">{slot.slots} slots</span>
                </motion.div>
              ))}
            </div>
            <div className="mt-6 p-3 bg-blue-800 border border-blue-700 rounded-lg text-center">
              <p className="text-sm text-blue-200">Next free slot: <span className="font-bold">Tomorrow 10:00 AM</span></p>
            </div>
          </div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-blue-900 rounded-2xl p-5 border border-blue-950 shadow-md text-center cursor-pointer"
          >
            <Calendar className="w-8 h-8 mx-auto mb-2 text-blue-300" />
            <h3 className="font-semibold text-blue-100">Schedule New Ad</h3>
            <p className="text-sm text-blue-200 mt-1">Drag ads to calendar view</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminAds;
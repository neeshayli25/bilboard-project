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
  Trash2,
  CheckSquare
} from "lucide-react";
import { getAllAds, approveAd, rejectAd, deleteAd } from "../../services/adminApi";
import { buildMediaUrl } from "../../utils/media";

const AdminAds = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewAd, setPreviewAd] = useState(null);
  const [mediaUrl, setMediaUrl] = useState("");

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    setLoading(true);
    try {
      const res = await getAllAds();
      // Ensure we get an array even if the backend returns nothing
      setAds(res.data || []);
    } catch (err) {
      console.error("Ads Loading Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveAd(id);
      loadAds();
    } catch(e) { console.error(e); alert("Approval failed."); }
  };

  const handleReject = async (id) => {
    try {
      await rejectAd(id);
      loadAds();
    } catch(e) { console.error(e); alert("Rejection failed."); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Permanently delete this advertisement payload? This cannot be undone.")) {
      try {
        await deleteAd(id);
        loadAds();
      } catch(e) { console.error(e); alert("Deletion failed."); }
    }
  };

  const previewAdHandler = (ad) => {
    setPreviewAd(ad);
    setMediaUrl(buildMediaUrl(ad.mediaUrl || ad.imageUrl));
    setPreviewMode(true);
  };

  const closePreview = () => {
    setPreviewMode(false);
    setPreviewAd(null);
    setMediaUrl("");
  };

  // Filtering
  const filteredAds = ads.filter((ad) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (ad.title?.toLowerCase() || "").includes(term) ||
                          (ad.campaign?.toLowerCase() || "").includes(term);
    const matchesStatus = filterStatus === "all" || ad.approvalStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculate quick stats
  const pendingCount = ads.filter(a => a.approvalStatus === "pending").length;
  const approvedCount = ads.filter(a => a.approvalStatus === "approved").length;

  return (
    <div className="flex flex-col gap-6 h-full bg-darkBg text-textMain relative pb-16 min-h-screen">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute w-[600px] h-[600px] bg-amber-600 opacity-5 blur-[120px] top-40 right-20 rounded-full mix-blend-screen"></div>
      </div>

      <div className="relative z-10 w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-black text-white flex items-center gap-3">
               <CheckSquare className="text-amber-500"/> Content Moderation
            </h1>
            <p className="text-blue-100/60 mt-1">Review, approve, or reject Advertiser media payloads.</p>
          </div>
          <div className="flex gap-4">
             <div className="bg-[#131A2A]/80 backdrop-blur-sm border border-amber-500/20 rounded-xl px-5 py-3 text-center shadow-[0_0_15px_rgba(245,158,11,0.05)]">
               <p className="text-[10px] text-amber-200/50 uppercase tracking-widest mb-1 font-bold">Pending Review</p>
               <p className="text-lg font-black text-amber-400">{pendingCount}</p>
             </div>
             <div className="bg-[#131A2A]/80 backdrop-blur-sm border border-emerald-500/20 rounded-xl px-5 py-3 text-center shadow-[0_0_15px_rgba(16,185,129,0.05)]">
               <p className="text-[10px] text-emerald-200/50 uppercase tracking-widest mb-1 font-bold">Approved Intel</p>
               <p className="text-lg font-black text-emerald-400">{approvedCount}</p>
             </div>
          </div>
        </div>

        {/* Search & Filter Modules */}
        <div className="mb-8 bg-[#131A2A]/80 backdrop-blur-md rounded-2xl p-4 border border-white/5 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500/50 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by Ad Title or Campaign Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[#0A0F1C] border border-blue-500/20 rounded-xl text-white placeholder-blue-200/30 focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>
            
            {/* Filter Toggle block */}
            <div className="flex bg-[#0A0F1C] border border-blue-500/20 rounded-xl overflow-hidden w-full md:w-auto h-full">
              {["all", "pending", "approved", "rejected"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`flex-1 md:flex-none px-6 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${
                    filterStatus === status 
                    ? "bg-amber-500/20 text-amber-400" 
                    : "text-blue-200/40 hover:text-blue-200 hover:bg-white/5"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="w-full">
          {loading && !previewMode && (
             <div className="flex justify-center items-center h-64 text-amber-500/80 animate-pulse font-bold text-xl">Retrieving Ad Payloads...</div>
          )}

          <AnimatePresence mode="wait">
            {previewMode && previewAd ? (
              // Enhanced Preview Mode
              <motion.div
                key="preview-layer"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#131A2A]/90 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-6 md:p-10 shadow-[0_0_80px_rgba(245,158,11,0.15)] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 blur-[100px] rounded-full pointer-events-none mix-blend-screen"></div>

                <div className="relative z-10 flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-2xl font-black text-white">{previewAd.title}</h3>
                    <p className="text-blue-200/50 text-sm mt-1 uppercase tracking-widest font-bold">Secure Media Vault Viewer</p>
                  </div>
                  <button onClick={closePreview} className="text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors flex items-center justify-center">
                    <XCircle size={24} />
                  </button>
                </div>
                
                <div className="aspect-video bg-black/60 rounded-2xl overflow-hidden border border-white/10 flex justify-center items-center relative z-10 shadow-inner">
                  {previewAd.mediaType === "video" ? (
                    <video src={mediaUrl} controls autoPlay className="max-w-full max-h-full object-contain" />
                  ) : (
                    <img src={mediaUrl} alt={previewAd.title} className="max-w-full max-h-full object-contain" />
                  )}
                </div>
                <div className="relative z-10 flex justify-end mt-4">
                  <button onClick={closePreview} className="text-sm font-bold text-blue-200/70 hover:text-white transition-colors">Close Preview</button>
                </div>
              </motion.div>
            ) : (
              // Ad Grid Layout
              <motion.div key="grid-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
                {filteredAds.map((ad) => (
                  <div key={ad._id} className="bg-[#131A2A]/80 backdrop-blur-md border border-white/5 hover:border-blue-500/30 transition-all duration-300 rounded-3xl p-6 shadow-[0_0_20px_rgba(0,0,0,0.2)] flex flex-col md:flex-row gap-6 relative group overflow-hidden">
                    
                    {/* Status Glow Indication */}
                    <div className={`absolute top-0 left-0 w-1 h-full ${
                      ad.approvalStatus === 'approved' ? 'bg-emerald-500 shadow-[0_0_20px_#10b981]' :
                      ad.approvalStatus === 'rejected' ? 'bg-red-500 shadow-[0_0_20px_#ef4444]' :
                      'bg-amber-500 shadow-[0_0_20px_#f59e0b]'
                    }`}></div>

                    {/* Left: Metadata chunk */}
                    <div className="flex-1 flex flex-col pl-4">
                      <div className="flex justify-between items-start mb-3">
                         <div>
                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-amber-400 transition-colors">{ad.title || "Untitled Payload"}</h3>
                            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">{ad.campaign || "Unassigned Campaign"}</p>
                         </div>
                         <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            ad.approvalStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            ad.approvalStatus === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                          }`}>
                            {ad.approvalStatus}
                          </span>
                      </div>
                      
                      <p className="text-sm text-blue-100/60 leading-relaxed mb-6 line-clamp-2 min-h-[40px]">{ad.description || "No explicit description provided by Advertiser."}</p>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs font-medium text-blue-200/50 mt-auto">
                        <div className="flex items-center gap-2 bg-[#0A0F1C] px-3 py-2 rounded-lg border border-white/5">
                          {ad.mediaType === 'video' ? <Video size={14} className="text-primary"/> : <ImageIcon size={14} className="text-primary"/>}
                          <span className="capitalize">{ad.mediaType || "Image"}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-[#0A0F1C] px-3 py-2 rounded-lg border border-white/5">
                          <Calendar size={14} className="text-primary"/>
                          <span>{new Date(ad.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right: Actions Column */}
                    <div className="flex flex-row md:flex-col justify-end gap-3 border-t md:border-t-0 md:border-l border-white/5 pt-5 md:pt-0 md:pl-5">
                      <button onClick={() => previewAdHandler(ad)} className="flex items-center justify-center gap-2 flex-1 md:flex-none p-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl transition-all font-bold text-xs" title="Preview Media">
                        <Eye size={16} /> Preview
                      </button>
                      
                      {ad.approvalStatus === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(ad._id)} className="flex items-center justify-center gap-2 flex-1 md:flex-none p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl transition-all font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                            <CheckCircle size={16} /> Approve
                          </button>
                          <button onClick={() => handleReject(ad._id)} className="flex items-center justify-center gap-2 flex-1 md:flex-none p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-all font-bold text-xs">
                            <XCircle size={16} /> Reject
                          </button>
                        </>
                      )}
                      
                      {ad.approvalStatus !== 'pending' && (
                         <button onClick={() => handleDelete(ad._id)} className="flex items-center justify-center gap-2 flex-1 md:flex-none p-3 bg-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 text-white/50 border border-white/10 rounded-xl transition-all font-bold text-xs mt-auto">
                           <Trash2 size={16} /> Purge Record
                         </button>
                      )}
                    </div>

                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty State Guard */}
          {!previewMode && !loading && filteredAds.length === 0 && (
             <div className="flex flex-col items-center justify-center p-16 bg-[#131A2A]/40 border border-white/5 border-dashed rounded-3xl mt-6">
                <CheckSquare size={48} className="text-white/10 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Payloads Found</h3>
                <p className="text-blue-200/50">There are no advertising payloads matching the current status filter.</p>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminAds;

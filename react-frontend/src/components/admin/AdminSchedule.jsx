import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  Clock3,
  CreditCard,
  ImagePlus,
  MapPin,
  Monitor,
  MonitorPlay,
  Search,
  UserRound,
  XCircle,
} from "lucide-react";
import { getBookings, sendAdToDisplay, updateBookingStatus } from "../../services/adminApi";
import { buildMediaUrl } from "../../utils/media";

const STAGE_META = {
  pending_review: {
    label: "Awaiting Review",
    color: "text-violet-300",
    border: "border-violet-500/30",
    bg: "bg-violet-500/10",
  },
  approved: {
    label: "Approved - Waiting Payment",
    color: "text-sky-300",
    border: "border-sky-500/30",
    bg: "bg-sky-500/10",
  },
  proof_submitted: {
    label: "Proof Submitted",
    color: "text-amber-300",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
  },
  verified: {
    label: "Verified / Scheduled",
    color: "text-emerald-300",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
  },
  active: {
    label: "Live",
    color: "text-cyan-300",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/10",
  },
  completed: {
    label: "Completed",
    color: "text-blue-300",
    border: "border-blue-500/30",
    bg: "bg-blue-500/10",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-300",
    border: "border-red-500/30",
    bg: "bg-red-500/10",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-slate-300",
    border: "border-slate-500/30",
    bg: "bg-slate-500/10",
  },
};

function formatPkr(value) {
  return `PKR ${Number(value || 0).toLocaleString()}`;
}

function getScheduleStage(booking) {
  if (booking.status === "rejected") return "rejected";
  if (booking.status === "cancelled") return "cancelled";
  if (booking.status === "completed") return "completed";
  if (booking.status === "active") return "active";
  if (booking.status === "scheduled" && booking.paymentStatus === "paid") return "verified";
  if (booking.status === "approved" && booking.paymentStatus === "submitted") return "proof_submitted";
  if (booking.status === "approved") return "approved";
  if (booking.status === "pending") return "pending_review";
  return "pending_review";
}

function StatusBadge({ stage }) {
  const config = STAGE_META[stage] || STAGE_META.pending_review;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${config.color} ${config.border} ${config.bg}`}
    >
      {config.label}
    </span>
  );
}

function PreviewPanel({ title, imageUrl, mediaType, fallbackIcon: FallbackIcon, alt }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0A0F1C]/80">
      <div className="border-b border-white/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/45">
        {title}
      </div>
      <div className="flex h-52 items-center justify-center bg-black/40">
        {imageUrl ? (
          mediaType === "video" ? (
            <video src={buildMediaUrl(imageUrl)} className="h-full w-full object-cover" muted autoPlay loop playsInline />
          ) : (
            <img src={buildMediaUrl(imageUrl)} alt={alt} className="h-full w-full object-cover" />
          )
        ) : (
          <FallbackIcon size={34} className="text-white/20" />
        )}
      </div>
    </div>
  );
}

function getPaymentStateText(booking) {
  if (booking.paymentStatus === "paid") return "Verified";
  if (booking.paymentStatus === "submitted") return "Proof Submitted";
  if (booking.paymentStatus === "failed") return "Proof Rejected";
  return "Pending";
}

export default function AdminSchedule() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStage, setFilterStage] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [workingId, setWorkingId] = useState("");

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await getBookings();
      setBookings(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return bookings.filter((booking) => {
      const stage = getScheduleStage(booking);
      const matchesStage = filterStage === "all" || stage === filterStage;
      if (!matchesStage) return false;

      if (!term) return true;

      return [
        booking.billboard?.name,
        booking.billboard?.location,
        booking.billboard?.city,
        booking.ad?.title,
        booking.customerName,
        booking.customerEmail,
        booking.customerPhone,
        booking.advertiser?.name,
        booking.advertiser?.email,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [bookings, filterStage, searchTerm]);

  const counts = useMemo(
    () => ({
      all: bookings.length,
      pending_review: bookings.filter((booking) => getScheduleStage(booking) === "pending_review").length,
      approved: bookings.filter((booking) => getScheduleStage(booking) === "approved").length,
      proof_submitted: bookings.filter((booking) => getScheduleStage(booking) === "proof_submitted").length,
      verified: bookings.filter((booking) => getScheduleStage(booking) === "verified").length,
      active: bookings.filter((booking) => getScheduleStage(booking) === "active").length,
      completed: bookings.filter((booking) => getScheduleStage(booking) === "completed").length,
    }),
    [bookings]
  );

  const handleStatusUpdate = async (bookingId, status) => {
    setWorkingId(bookingId);
    try {
      await updateBookingStatus(bookingId, status);
      await loadBookings();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Could not update the booking status.");
    } finally {
      setWorkingId("");
    }
  };

  const handleDisplayNow = async (bookingId) => {
    setWorkingId(bookingId);
    try {
      await sendAdToDisplay({ bookingId });
      await loadBookings();
      alert("Scheduled ad was pushed to the display simulator.");
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Could not push this ad to the display.");
    } finally {
      setWorkingId("");
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-16">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black text-white">
            <Calendar className="text-sky-400" /> Schedule Control Room
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-blue-100/60">
            Review every stage from admin approval and proof submission to verified scheduling, live playback, and completed runs.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { key: "approved", label: "Approved", value: counts.approved, color: "text-sky-300" },
            { key: "proof_submitted", label: "Proof Sent", value: counts.proof_submitted, color: "text-amber-300" },
            { key: "verified", label: "Verified", value: counts.verified, color: "text-emerald-300" },
            { key: "active", label: "Live", value: counts.active, color: "text-cyan-300" },
            { key: "completed", label: "Completed", value: counts.completed, color: "text-blue-300" },
          ].map((card) => (
            <div key={card.key} className="rounded-2xl border border-white/5 bg-[#131A2A]/80 px-4 py-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">{card.label}</p>
              <p className={`mt-1 text-xl font-black ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by ad, advertiser, customer, or billboard..."
            className="w-full rounded-2xl border border-white/10 bg-[#131A2A]/80 py-3 pl-12 pr-4 text-white focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: `All (${counts.all})` },
            { id: "pending_review", label: `Awaiting Review (${counts.pending_review})` },
            { id: "approved", label: `Approved (${counts.approved})` },
            { id: "proof_submitted", label: `Proof Submitted (${counts.proof_submitted})` },
            { id: "verified", label: `Verified (${counts.verified})` },
            { id: "active", label: `Live (${counts.active})` },
            { id: "completed", label: `Completed (${counts.completed})` },
            { id: "rejected", label: "Rejected" },
            { id: "cancelled", label: "Cancelled" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilterStage(item.id)}
              className={`rounded-xl border px-4 py-3 text-xs font-black uppercase tracking-[0.2em] transition ${
                filterStage === item.id
                  ? "border-sky-500/40 bg-sky-500/15 text-sky-200"
                  : "border-white/10 bg-white/5 text-white/45 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center rounded-3xl border border-white/5 bg-[#131A2A]/60 text-lg font-black text-sky-300">
          Loading schedule...
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-[#131A2A]/40 px-6 text-center">
          <Calendar size={42} className="mb-4 text-white/20" />
          <h3 className="text-xl font-black text-white">No schedule items for this filter</h3>
          <p className="mt-2 max-w-xl text-sm text-blue-100/45">
            Once advertisers book, pay, and get verified, their campaigns will appear here with the current workflow state.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {filteredBookings.map((booking, index) => {
            const stage = getScheduleStage(booking);
            const ratePerMinute = Number(booking.ratePerMinute ?? booking.billboard?.pricePerMinute ?? booking.billboard?.pricePerHour ?? 0);

            return (
              <motion.div
                key={booking._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="rounded-3xl border border-white/5 bg-[#131A2A]/85 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.24)]"
              >
                <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                    <PreviewPanel
                      title="Billboard Preview"
                      imageUrl={booking.billboard?.imageUrl}
                      mediaType="image"
                      fallbackIcon={Monitor}
                      alt={booking.billboard?.name || "Billboard"}
                    />
                    <PreviewPanel
                      title="Ad Creative"
                      imageUrl={booking.ad?.mediaUrl}
                      mediaType={booking.ad?.mediaType}
                      fallbackIcon={ImagePlus}
                      alt={booking.ad?.title || "Ad Creative"}
                    />
                  </div>

                  <div className="space-y-5">
                    <div className="flex flex-col gap-3 border-b border-white/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-2xl font-black text-white">{booking.ad?.title || "Uploaded Ad"}</h2>
                          <StatusBadge stage={stage} />
                        </div>
                        <p className="mt-2 text-sm text-blue-100/60">
                          Billboard: <span className="font-bold text-white">{booking.billboard?.name || "Unknown Billboard"}</span>
                        </p>
                      </div>

                      <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-200/70">
                          Payment Status
                        </p>
                        <p className="mt-1 text-xl font-black text-white">{formatPkr(booking.totalPrice)}</p>
                        <p className={`mt-1 text-xs font-bold ${booking.paymentStatus === "paid" ? "text-emerald-300" : "text-amber-300"}`}>
                          {getPaymentStateText(booking)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-[#0A0F1C]/60 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">Billboard and Slot</p>
                        <div className="mt-4 space-y-3 text-sm text-blue-100/70">
                          <p className="flex items-start gap-2">
                            <MapPin size={15} className="mt-0.5 text-sky-300" />
                            <span>{booking.billboard?.city}, {booking.billboard?.location}</span>
                          </p>
                          <p className="flex items-start gap-2">
                            <Calendar size={15} className="mt-0.5 text-sky-300" />
                            <span>{new Date(booking.date).toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })}</span>
                          </p>
                          <p className="flex items-start gap-2">
                            <Clock3 size={15} className="mt-0.5 text-sky-300" />
                            <span>{booking.timeSlot}</span>
                          </p>
                          <p className="flex items-start gap-2">
                            <Monitor size={15} className="mt-0.5 text-sky-300" />
                            <span>
                              {booking.billboard?.size || "Digital Screen"} · {booking.billboard?.type || "Billboard"} · {booking.billboard?.resolution || "N/A"}
                            </span>
                          </p>
                          <p className="flex items-start gap-2">
                            <CheckCircle2 size={15} className="mt-0.5 text-sky-300" />
                            <span>
                              Screen {booking.billboard?.displayConfig?.screenCode || "not assigned"} ·{" "}
                              {booking.billboard?.displayConfig?.onlineStatus || "offline"} · Arduino{" "}
                              {booking.billboard?.displayConfig?.arduinoConnected ? "connected" : "not connected"}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-[#0A0F1C]/60 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">Advertiser and Payment</p>
                        <div className="mt-4 space-y-3 text-sm text-blue-100/70">
                          <p className="flex items-start gap-2">
                            <UserRound size={15} className="mt-0.5 text-sky-300" />
                            <span>{booking.advertiser?.name || "Unknown advertiser"} ({booking.advertiser?.email || "No email"})</span>
                          </p>
                          <p className="flex items-start gap-2">
                            <CreditCard size={15} className="mt-0.5 text-sky-300" />
                            <span>{booking.paymentMethod || "bank_transfer"} · Ref: {booking.gatewayReference || booking.gatewayTransactionId || "N/A"}</span>
                          </p>
                          <p className="flex items-start gap-2">
                            <CheckCircle2 size={15} className="mt-0.5 text-sky-300" />
                            <span>Customer: {booking.customerName || booking.advertiser?.name || "N/A"} · {booking.customerPhone || booking.advertiser?.phone || "No phone"}</span>
                          </p>
                          <p className="flex items-start gap-2">
                            <Calendar size={15} className="mt-0.5 text-sky-300" />
                            <span>{booking.durationMinutes || 0} mins at {formatPkr(ratePerMinute)} / slot</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0A0F1C]/60 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">Creative Details</p>
                      <div className="mt-3 grid gap-3 text-sm text-blue-100/70">
                        <p>{booking.ad?.description || "No ad description was provided."}</p>
                        <div className="flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                          <span>{booking.ad?.mediaType || "media"}</span>
                          <span>{booking.ad?.duration || 30}s loop</span>
                          <span>{booking.ad?.approvalStatus || "pending"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {(stage === "pending_review" || stage === "approved" || stage === "proof_submitted") && (
                        <button
                          type="button"
                          onClick={() => navigate("/admin/bookings")}
                          className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-5 py-3 text-sm font-black text-sky-200 hover:bg-sky-500/20"
                        >
                          Open Booking Queue
                        </button>
                      )}

                      {stage === "verified" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDisplayNow(booking._id)}
                            disabled={workingId === booking._id}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-5 py-3 text-sm font-black text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
                          >
                            <MonitorPlay size={16} /> Display Now
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(booking._id, "active")}
                            disabled={workingId === booking._id}
                            className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-3 text-sm font-black text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
                          >
                            Mark Live
                          </button>
                        </>
                      )}

                      {stage === "active" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDisplayNow(booking._id)}
                            disabled={workingId === booking._id}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-5 py-3 text-sm font-black text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
                          >
                            <MonitorPlay size={16} /> Display Now
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(booking._id, "completed")}
                            disabled={workingId === booking._id}
                            className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-3 text-sm font-black text-blue-200 hover:bg-blue-500/20 disabled:opacity-50"
                          >
                            Mark Completed
                          </button>
                        </>
                      )}

                      {(stage === "verified" || stage === "active") && (
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(booking._id, "cancelled")}
                          disabled={workingId === booking._id}
                          className="rounded-xl border border-slate-500/30 bg-slate-500/10 px-5 py-3 text-sm font-black text-slate-200 hover:bg-slate-500/20 disabled:opacity-50"
                        >
                          Cancel Schedule
                        </button>
                      )}

                      {stage === "cancelled" && (
                        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-500/25 bg-slate-500/10 px-4 py-3 text-sm font-bold text-slate-200">
                          <XCircle size={16} className="text-slate-300" />
                          This booking was cancelled and needs a fresh request.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Image,
  LoaderCircle,
  MapPin,
  Monitor,
  MonitorPlay,
  PlayCircle,
  PlusCircle,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  displayMyBooking,
  getAdvertiserStats,
  getAllBillboards,
  getMyAds,
  getMyBookings,
  getPayments,
} from "../../api";
import { buildMediaUrl } from "../../utils/media";

const STATUS_MAP = {
  approved: { color: "#0ea5e9", bg: "#0ea5e920", label: "Approved - Pay" },
  submitted: { color: "#f59e0b", bg: "#f59e0b20", label: "Proof Sent" },
  scheduled: { color: "#14b8a6", bg: "#14b8a620", label: "Scheduled" },
  active: { color: "#10b981", bg: "#10b98120", label: "Live" },
  pending: { color: "#8b5cf6", bg: "#8b5cf620", label: "Pending Review" },
  rejected: { color: "#ef4444", bg: "#ef444420", label: "Rejected" },
  cancelled: { color: "#94a3b8", bg: "#94a3b820", label: "Cancelled" },
  completed: { color: "#6366f1", bg: "#6366f120", label: "Completed" },
  paid: { color: "#10b981", bg: "#10b98120", label: "Verified" },
};

function formatPkr(value) {
  return `PKR ${Number(value || 0).toLocaleString()}`;
}

function getBookingBadgeStatus(booking) {
  if (booking.status === "approved" && booking.paymentStatus === "submitted") return "submitted";
  if (["scheduled", "active", "completed"].includes(booking.status) && booking.paymentStatus === "paid") {
    return "paid";
  }
  return booking.status;
}

function getBookingStageText(booking) {
  if (booking.status === "approved" && booking.paymentStatus === "submitted") {
    return "Payment proof sent and waiting for admin verification.";
  }
  if (booking.status === "approved" && booking.paymentStatus !== "paid") {
    return "Approved by admin. Pay before the timer ends to lock this slot.";
  }
  if (booking.status === "active") {
    return "Your ad is live on the billboard right now.";
  }
  if (booking.status === "scheduled") {
    return "Payment verified and ad moved into the scheduled queue.";
  }
  if (booking.status === "completed") {
    return "This booking has already completed its scheduled run.";
  }
  if (booking.status === "cancelled") {
    return "Payment window expired and the request was cancelled.";
  }
  if (booking.status === "rejected") {
    return "This request was rejected by admin.";
  }
  return "Your request is still awaiting admin review.";
}

function getTransactionMethodLabel(transaction) {
  const method = transaction?.method || transaction?.gateway || "bank_transfer";
  if (method === "easypaisa") return "Easypaisa";
  if (method === "jazzcash") return "JazzCash";
  if (method === "bank_transfer") return "Bank Transfer";
  return method;
}

function isVerifiedTransaction(transaction) {
  return (
    transaction?.status === "completed" ||
    transaction?.status === "paid" ||
    transaction?.paymentStatus === "paid"
  );
}

function Badge({ status }) {
  const meta = STATUS_MAP[status] || { color: "#94a3b8", bg: "#94a3b820", label: status };
  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
      style={{ color: meta.color, backgroundColor: meta.bg, borderColor: `${meta.color}35` }}
    >
      {meta.label}
    </span>
  );
}

function DashboardCard({ children, className = "" }) {
  return (
    <div
      className={`bg-[#131A2A]/80 backdrop-blur-md rounded-3xl p-6 lg:p-8 border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.3)] ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({ title, Icon, color = "#6366f1", action, actionLabel }) {
  return (
    <div className="flex justify-between items-center mb-6 gap-4">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${color}20, ${color}05)`,
            border: `1px solid ${color}30`,
          }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <h2 className="text-xl font-black text-white">{title}</h2>
      </div>
      {action && (
        <button
          type="button"
          onClick={action}
          className="text-xs font-bold uppercase tracking-widest flex items-center gap-1 transition-colors hover:opacity-80"
          style={{ color }}
        >
          {actionLabel} <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

function KPI({ label, value, sub, Icon, color, onClick }) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -3 }}
      onClick={onClick}
      className="relative rounded-3xl p-6 overflow-hidden text-left"
      style={{ background: "#131A2A", border: `1px solid ${color}20` }}
    >
      <div
        className="absolute inset-0 opacity-10 blur-[40px] rounded-full"
        style={{ background: color, width: "60%", height: "60%", top: "20%", left: "20%" }}
      />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-2" style={{ color }}>
            {label}
          </p>
          <p className="text-3xl font-black text-white">{value}</p>
          {sub && <p className="text-xs mt-1 text-blue-200/40">{sub}</p>}
        </div>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}
        >
          <Icon size={22} style={{ color }} />
        </div>
      </div>
    </motion.button>
  );
}

function MediaPreview({ label, url, mediaType, fallbackIcon: FallbackIcon, autoPlay = false, alt }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0A0F1C]/70">
      <div className="border-b border-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
        {label}
      </div>
      <div className="flex h-52 items-center justify-center bg-black/40">
        {url ? (
          mediaType === "video" ? (
            <video
              src={url}
              className="h-full w-full object-cover"
              muted
              playsInline
              loop
              autoPlay={autoPlay}
              controls={!autoPlay}
            />
          ) : (
            <img src={url} alt={alt} className="h-full w-full object-cover" />
          )
        ) : (
          <FallbackIcon size={34} className="text-white/20" />
        )}
      </div>
    </div>
  );
}

export default function AdvertiserDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalAds: 0, activeCampaigns: 0, totalSpend: 0, pendingApprovals: 0 });
  const [billboards, setBillboards] = useState([]);
  const [myAds, setMyAds] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingFilter, setBookingFilter] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [displayingBookingId, setDisplayingBookingId] = useState("");

  const rawName = sessionStorage.getItem("name") || "Advertiser";
  const firstName = rawName.split(" ")[0];

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [statsRes, billboardsRes, adsRes, bookingsRes, paymentsRes] = await Promise.all([
          getAdvertiserStats(),
          getAllBillboards(),
          getMyAds(),
          getMyBookings(),
          getPayments(),
        ]);

        setStats(statsRes.data || {});
        setBillboards(billboardsRes.data || []);
        setMyAds(adsRes.data || []);
        setBookings(bookingsRes.data || []);
        setTransactions(paymentsRes.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const scheduledBookings = useMemo(
    () =>
      bookings
        .filter((booking) => ["scheduled", "active", "completed"].includes(booking.status))
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [bookings]
  );

  const filteredBookings = useMemo(
    () => bookings.filter((booking) => bookingFilter === "all" || booking.status === bookingFilter),
    [bookings, bookingFilter]
  );

  const totalPaid = useMemo(
    () =>
      transactions.reduce((sum, transaction) => {
        if (!isVerifiedTransaction(transaction)) return sum;
        return sum + (Number(transaction.amount) || Number(transaction.totalPrice) || 0);
      }, 0),
    [transactions]
  );

  const verifiedTransactions = useMemo(
    () => transactions.filter((transaction) => isVerifiedTransaction(transaction)),
    [transactions]
  );

  const uploadedAds = useMemo(
    () => [...myAds].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [myAds]
  );

  const cities = useMemo(
    () => [...new Set(billboards.map((billboard) => billboard.city))].filter(Boolean).sort(),
    [billboards]
  );

  const availableLocations = useMemo(() => {
    const source =
      selectedCity === "all"
        ? billboards
        : billboards.filter((billboard) => billboard.city === selectedCity);

    return [...new Set(source.map((billboard) => billboard.location))].filter(Boolean).sort();
  }, [billboards, selectedCity]);

  const filteredBillboards = useMemo(() => {
    let next = [...billboards];
    if (selectedCity !== "all") {
      next = next.filter((billboard) => billboard.city === selectedCity);
    }
    if (selectedLocation !== "all") {
      next = next.filter((billboard) => billboard.location === selectedLocation);
    }
    return next.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [billboards, selectedCity, selectedLocation]);

  const handleDisplayDemo = async (bookingId) => {
    setDisplayingBookingId(bookingId);
    try {
      await displayMyBooking(bookingId);
    } catch (error) {
      console.error(error);
    } finally {
      setDisplayingBookingId("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-indigo-400 font-bold">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-16">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute w-[600px] h-[600px] bg-indigo-600 opacity-5 blur-[120px] -top-20 -left-20 rounded-full" />
        <div className="absolute w-[400px] h-[400px] bg-cyan-600 opacity-5 blur-[100px] top-1/2 right-0 rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col gap-10">
        <div
          className="rounded-3xl overflow-hidden relative shadow-2xl"
          style={{ background: "linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#0f766e 100%)" }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            }}
          />
          <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-indigo-300" />
                <span className="text-indigo-300 text-xs font-black uppercase tracking-[0.2em]">
                  Dashboard Overview
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tight">
                Welcome, {firstName}
              </h1>
              <p className="text-indigo-200/70 font-medium tracking-wide">
                {new Date().toLocaleDateString("en-PK", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="flex gap-4 flex-wrap">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/advertiser/create-booking")}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all"
                style={{
                  background: "#6366f1",
                  color: "#fff",
                  boxShadow: "0 0 40px rgba(99,102,241,0.5)",
                  border: "1px solid #818cf8",
                }}
              >
                <PlusCircle size={18} /> Create Booking
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/advertiser/my-bookings")}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all bg-white/10 text-white border border-white/15 hover:bg-white/15"
              >
                <Calendar size={18} /> View Bookings
              </motion.button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <KPI
            label="Total Ads"
            value={stats.totalAds || 0}
            sub="Creatives attached to your bookings"
            Icon={Image}
            color="#6366f1"
            onClick={() => navigate("/advertiser/create-booking")}
          />
          <KPI
            label="Active Campaigns"
            value={stats.activeCampaigns || 0}
            sub="Currently scheduled or live"
            Icon={TrendingUp}
            color="#10b981"
            onClick={() => navigate("/advertiser/my-bookings")}
          />
          <KPI
            label="Total Paid"
            value={formatPkr(totalPaid)}
            sub="Verified payments in the system"
            Icon={CreditCard}
            color="#8b5cf6"
            onClick={() => navigate("/advertiser/payments")}
          />
          <KPI
            label="Pending Reviews"
            value={stats.pendingApprovals || 0}
            sub="Awaiting admin approval or proof check"
            Icon={Clock}
            color="#f59e0b"
            onClick={() => navigate("/advertiser/my-bookings")}
          />
        </div>

        <DashboardCard>
          <SectionHeader
            title="Scheduled Campaigns"
            Icon={Calendar}
            color="#ec4899"
            action={() => navigate("/advertiser/my-bookings")}
            actionLabel="Open Bookings"
          />
          {scheduledBookings.length === 0 ? (
            <div className="text-center py-10 border border-white/5 rounded-2xl bg-white/5">
              <Calendar size={40} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/40 font-medium">No scheduled or live campaigns yet.</p>
              <button
                type="button"
                onClick={() => navigate("/advertiser/create-booking")}
                className="mt-3 text-xs font-bold text-pink-400 hover:text-pink-300 transition-colors uppercase tracking-wider"
              >
                Book a slot now
              </button>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {scheduledBookings.slice(0, 4).map((booking) => {
                const billboardImage = buildMediaUrl(booking.billboard?.imageUrl);
                const adMedia = buildMediaUrl(booking.ad?.mediaUrl);

                return (
                  <div
                    key={booking._id}
                    className="rounded-3xl border border-white/5 bg-[#0A0F1C]/55 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                      <div>
                        <p className="text-xl font-black text-white">{booking.ad?.title || "Uploaded Ad"}</p>
                        <p className="mt-1 text-sm text-blue-100/55">
                          {booking.billboard?.name || "Billboard"} · {booking.billboard?.city}
                        </p>
                      </div>
                      <Badge status={getBookingBadgeStatus(booking)} />
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <MediaPreview
                        label="Billboard"
                        url={billboardImage}
                        mediaType="image"
                        fallbackIcon={Monitor}
                        alt={booking.billboard?.name || "Billboard"}
                      />
                      <MediaPreview
                        label="Ad Creative"
                        url={adMedia}
                        mediaType={booking.ad?.mediaType}
                        fallbackIcon={PlayCircle}
                        autoPlay
                        alt={booking.ad?.title || "Ad Creative"}
                      />
                    </div>

                    <div className="mt-5 grid gap-3 text-sm text-blue-100/65 md:grid-cols-2">
                      <p className="flex items-start gap-2">
                        <MapPin size={15} className="mt-0.5 text-pink-300" />
                        <span>
                          {booking.billboard?.city}, {booking.billboard?.location}
                        </span>
                      </p>
                      <p className="flex items-start gap-2">
                        <Calendar size={15} className="mt-0.5 text-pink-300" />
                        <span>{new Date(booking.date).toLocaleDateString("en-PK")}</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <Clock size={15} className="mt-0.5 text-pink-300" />
                        <span>{booking.timeSlot}</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <CreditCard size={15} className="mt-0.5 text-pink-300" />
                        <span>{formatPkr(booking.totalPrice)}</span>
                      </p>
                    </div>

                    <p className="mt-4 text-sm text-blue-100/55">{getBookingStageText(booking)}</p>

                    <div className="mt-4 flex flex-wrap justify-end gap-3">
                      {["scheduled", "active"].includes(booking.status) && (
                        <button
                          type="button"
                          onClick={() => handleDisplayDemo(booking._id)}
                          disabled={displayingBookingId === booking._id}
                          className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-sky-300 hover:bg-sky-500/15 disabled:opacity-60"
                        >
                          {displayingBookingId === booking._id ? (
                            <>
                              <LoaderCircle size={14} className="animate-spin" /> Sending
                            </>
                          ) : (
                            <>
                              <MonitorPlay size={14} /> Display Demo
                            </>
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/advertiser/my-bookings?booking=${booking._id}`)}
                        className="inline-flex items-center gap-2 rounded-xl border border-pink-500/30 bg-pink-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-pink-300 hover:bg-pink-500/15"
                      >
                        View Booking <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardCard>

        <DashboardCard>
          <SectionHeader
            title="My Bookings"
            Icon={CheckCircle2}
            color="#10b981"
            action={() => navigate("/advertiser/my-bookings")}
            actionLabel="View All"
          />
          <div className="flex gap-2 mb-6 flex-wrap">
            {["all", "pending", "approved", "scheduled", "active", "rejected", "cancelled"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setBookingFilter(status)}
                className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border"
                style={
                  bookingFilter === status
                    ? {
                        background: "#10b98120",
                        color: "#34d399",
                        border: "1px solid #10b98140",
                        boxShadow: "0 0 20px rgba(16,185,129,0.2)",
                      }
                    : {
                        background: "transparent",
                        color: "#475569",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }
                }
              >
                {status}
              </button>
            ))}
          </div>

          {filteredBookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/30 text-sm">No bookings match the selected status.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBookings.slice(0, 6).map((booking) => (
                <button
                  key={booking._id}
                  type="button"
                  onClick={() => navigate(`/advertiser/my-bookings?booking=${booking._id}`)}
                  className="flex justify-between items-center p-5 rounded-2xl border border-white/5 bg-[#0A0F1C]/40 hover:border-white/10 transition-colors text-left"
                >
                  <div>
                    <p className="text-base font-bold text-white mb-1">
                      {booking.billboard?.name || "Billboard"}
                    </p>
                    <p className="text-xs text-blue-200/50 flex items-center gap-2">
                      <Calendar size={12} className="text-emerald-500" />
                      {new Date(booking.date).toLocaleDateString()} at {booking.timeSlot}
                    </p>
                    <p className="mt-2 text-[11px] text-blue-100/55">{getBookingStageText(booking)}</p>
                  </div>
                  <Badge status={getBookingBadgeStatus(booking)} />
                </button>
              ))}
            </div>
          )}
        </DashboardCard>

        <DashboardCard>
          <SectionHeader
            title="Payment Activity"
            Icon={CreditCard}
            color="#8b5cf6"
            action={() => navigate("/advertiser/payments")}
            actionLabel="Full History"
          />

          <div className="flex items-center justify-between mb-8 p-6 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-transparent">
            <div>
              <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest mb-1">
                Total Verified Payments
              </p>
              <p className="text-3xl font-black text-white">{formatPkr(totalPaid)}</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
              <CreditCard size={24} className="text-purple-400" />
            </div>
          </div>

          {verifiedTransactions.length === 0 ? (
            <div className="text-center py-6 text-white/30 text-sm">No verified payments yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {verifiedTransactions.slice(0, 4).map((transaction) => (
                <div
                  key={transaction._id}
                  className="p-5 rounded-2xl border border-white/5 bg-[#0A0F1C]/40 flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4 gap-3">
                    <Badge status="paid" />
                    <span className="text-[10px] text-white/30">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-lg font-black text-white mb-1">
                    {formatPkr(transaction.amount || transaction.totalPrice)}
                  </p>
                  <p className="text-xs text-blue-200/45 uppercase tracking-widest font-bold">
                    via {getTransactionMethodLabel(transaction)}
                  </p>
                  <p className="mt-3 text-xs text-blue-100/45">
                    {transaction.booking?.billboard?.name || "Booking payment"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>

        <DashboardCard>
          <SectionHeader
            title="Recent Ad Creatives"
            Icon={Image}
            color="#f59e0b"
            action={() => navigate("/advertiser/create-booking")}
            actionLabel="New Booking"
          />
          {uploadedAds.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/30 text-sm">Your uploaded creatives from bookings will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {uploadedAds.slice(0, 6).map((ad) => (
                <div
                  key={ad._id}
                  className="flex gap-4 p-4 rounded-2xl border border-white/5 bg-[#0A0F1C]/40 hover:bg-white/5 transition-colors"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 shadow-lg">
                    {ad.mediaType === "image" ? (
                      <img src={buildMediaUrl(ad.mediaUrl)} className="w-full h-full object-cover" alt={ad.title} />
                    ) : (
                      <video
                        src={buildMediaUrl(ad.mediaUrl)}
                        className="w-full h-full object-cover"
                        muted
                        autoPlay
                        loop
                        playsInline
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="font-bold text-white text-base truncate mb-1">{ad.title || "Untitled Ad"}</p>
                    <div className="flex items-center justify-between mt-auto gap-3">
                      <p className="text-[10px] text-blue-200/40">{new Date(ad.createdAt).toLocaleDateString()}</p>
                      <Badge status={ad.approvalStatus} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>

        <DashboardCard>
          <SectionHeader
            title="Browse Billboards"
            Icon={Monitor}
            color="#0ea5e9"
            action={() => navigate("/advertiser/billboards")}
            actionLabel="Explore"
          />

          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1">
              <label className="block text-[10px] font-black text-sky-400/70 uppercase tracking-widest mb-2">
                Filter by City
              </label>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCity("all");
                    setSelectedLocation("all");
                  }}
                  className={`text-xs font-bold px-4 py-2 rounded-xl transition-all border ${
                    selectedCity === "all"
                      ? "bg-sky-500/20 text-sky-400 border-sky-500/40"
                      : "bg-transparent text-white/50 border-white/10 hover:bg-white/5"
                  }`}
                >
                  All Cities
                </button>
                {cities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => {
                      setSelectedCity(city);
                      setSelectedLocation("all");
                    }}
                    className={`text-xs font-bold px-4 py-2 rounded-xl transition-all border ${
                      selectedCity === city
                        ? "bg-sky-500/20 text-sky-400 border-sky-500/40"
                        : "bg-transparent text-white/50 border-white/10 hover:bg-white/5"
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>

            {selectedCity !== "all" && availableLocations.length > 0 && (
              <div className="flex-1">
                <label className="block text-[10px] font-black text-sky-400/70 uppercase tracking-widest mb-2">
                  Filter by Location
                </label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedLocation("all")}
                    className={`text-xs font-bold px-4 py-2 rounded-xl transition-all border ${
                      selectedLocation === "all"
                        ? "bg-sky-500/20 text-sky-400 border-sky-500/40"
                        : "bg-transparent text-white/50 border-white/10 hover:bg-white/5"
                    }`}
                  >
                    All Locations
                  </button>
                  {availableLocations.map((location) => (
                    <button
                      key={location}
                      type="button"
                      onClick={() => setSelectedLocation(location)}
                      className={`text-xs font-bold px-4 py-2 rounded-xl transition-all border ${
                        selectedLocation === location
                          ? "bg-sky-500/20 text-sky-400 border-sky-500/40"
                          : "bg-transparent text-white/50 border-white/10 hover:bg-white/5"
                      }`}
                    >
                      {location}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {filteredBillboards.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center border border-white/5 rounded-2xl bg-white/5">
              <Monitor size={40} className="text-white/10 mb-3" />
              <p className="text-white/30 font-medium">No billboards match your filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredBillboards.slice(0, 8).map((billboard) => (
                <motion.div
                  whileHover={{ y: -3, scale: 1.02 }}
                  key={billboard._id}
                  className="rounded-2xl overflow-hidden border border-white/5 hover:border-sky-500/40 transition-all cursor-pointer bg-[#0A0F1C]/80 shadow-lg"
                  onClick={() => navigate("/advertiser/billboards")}
                >
                  <div className="relative h-32 overflow-hidden bg-white/5">
                    {billboard.imageUrl ? (
                      <img
                        src={buildMediaUrl(billboard.imageUrl)}
                        alt={billboard.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Monitor size={24} className="text-white/10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1C] to-transparent" />
                    <span
                      className={`absolute top-3 right-3 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shadow-lg ${
                        billboard.status === "active"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                      }`}
                    >
                      {billboard.status}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-black text-white text-base truncate mb-1">{billboard.name}</h3>
                    <p className="text-xs text-blue-200/50 flex items-center gap-1.5 mb-4">
                      <MapPin size={12} className="text-sky-400" />
                      {billboard.city}, {billboard.location}
                    </p>
                    <div className="flex justify-between items-end border-t border-white/5 pt-3">
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-0.5">Rate</p>
                        <span className="text-sky-300 font-black text-sm">
                          {formatPkr(billboard.pricePerMinute || billboard.pricePerHour)}
                          <span className="text-[10px] text-white/30 font-normal"> / slot</span>
                        </span>
                      </div>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        className="text-[10px] font-black px-4 py-2 rounded-xl transition-colors uppercase tracking-widest"
                        style={{ background: "#0ea5e920", color: "#38bdf8", border: "1px solid #0ea5e940" }}
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate("/advertiser/create-booking");
                        }}
                      >
                        Book
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}

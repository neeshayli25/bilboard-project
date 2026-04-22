import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock3,
  CreditCard,
  Hash,
  MapPin,
  Monitor,
  PlayCircle,
  PlusCircle,
  Search,
  TrendingUp,
  UserRound,
} from "lucide-react";
import {
  getAllAds,
  getBillboards,
  getBookings,
  getTransactions,
} from "../../services/adminApi";
import { buildMediaUrl } from "../../utils/media";

function formatPkr(value) {
  return `PKR ${Number(value || 0).toLocaleString()}`;
}

function isVerifiedTransaction(transaction) {
  return (
    transaction?.status === "completed" ||
    transaction?.status === "paid" ||
    transaction?.paymentStatus === "paid"
  );
}

function getLiveStageLabel(booking) {
  if (booking.status === "active") return "Live";
  if (booking.status === "completed") return "Completed";
  return "Scheduled";
}

function getMethodLabel(transaction) {
  const method = transaction?.method || transaction?.gateway || "bank_transfer";
  if (method === "easypaisa") return "Easypaisa";
  if (method === "jazzcash") return "JazzCash";
  if (method === "bank_transfer") return "Bank Transfer";
  return method;
}

function renderBillboardGroups(billboards, viewMode) {
  const sorted = [...billboards].sort((left, right) => (left.name || "").localeCompare(right.name || ""));

  if (viewMode === "all") {
    return [{ key: "all", label: "All Billboards", items: sorted }];
  }

  const groupValue = (billboard) => {
    if (viewMode === "city") return billboard.city || "Unknown City";
    if (viewMode === "location") return billboard.location || "Unknown Location";
    const firstChar = (billboard.name || "#").trim().charAt(0).toUpperCase();
    return /[A-Z]/.test(firstChar) ? firstChar : "#";
  };

  const grouped = sorted.reduce((accumulator, billboard) => {
    const key = groupValue(billboard);
    if (!accumulator[key]) accumulator[key] = [];
    accumulator[key].push(billboard);
    return accumulator;
  }, {});

  return Object.entries(grouped)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, items]) => ({ key, label: key, items }));
}

function MediaPanel({ title, url, mediaType, alt, fallbackIcon: FallbackIcon }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0A0F1C]/80">
      <div className="border-b border-white/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/45">
        {title}
      </div>
      <div className="flex h-48 items-center justify-center bg-black/40">
        {url ? (
          mediaType === "video" ? (
            <video src={url} className="h-full w-full object-cover" muted autoPlay loop playsInline />
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [billboards, setBillboards] = useState([]);
  const [ads, setAds] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assetView, setAssetView] = useState("all");
  const [assetSearch, setAssetSearch] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [billboardsRes, adsRes, bookingsRes, transactionsRes] = await Promise.all([
          getBillboards(),
          getAllAds(),
          getBookings(),
          getTransactions(),
        ]);

        setBillboards(billboardsRes.data || []);
        setAds(adsRes.data || []);
        setBookings(bookingsRes.data || []);
        setPayments(transactionsRes.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const liveBookings = useMemo(
    () =>
      bookings
        .filter((booking) => ["scheduled", "active", "completed"].includes(booking.status))
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [bookings]
  );

  const totalRevenue = useMemo(
    () =>
      payments.reduce((sum, transaction) => {
        if (!isVerifiedTransaction(transaction)) return sum;
        return sum + (Number(transaction.amount) || Number(transaction.totalPrice) || 0);
      }, 0),
    [payments]
  );

  const filteredAssets = useMemo(() => {
    const term = assetSearch.trim().toLowerCase();
    if (!term) return billboards;

    return billboards.filter((billboard) =>
      [billboard.name, billboard.city, billboard.location, billboard.size, billboard.resolution]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [assetSearch, billboards]);

  const groupedAssets = useMemo(
    () => renderBillboardGroups(filteredAssets, assetView),
    [assetView, filteredAssets]
  );

  return (
    <div className="flex flex-col gap-10 bg-darkBg pb-16 relative">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute w-[500px] h-[500px] bg-blue-600 opacity-10 blur-[120px] top-10 left-20 rounded-full mix-blend-screen" />
        <div className="absolute w-[400px] h-[400px] bg-cyan-600 opacity-10 blur-[120px] bottom-10 right-20 rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full flex flex-col gap-10">
        <div className="relative overflow-hidden bg-[#0A0F1C]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-100 to-blue-300 mb-2">
              Command Center
            </h1>
            <p className="text-blue-100/60 text-sm font-medium">
              Managing {billboards.length} displays · {ads.length} creatives · {liveBookings.length} live schedule item
              {liveBookings.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="relative z-10 flex gap-4 items-center flex-wrap">
            <div className="bg-[#131A2A]/80 border border-blue-500/20 rounded-xl px-5 py-3 text-center">
              <p className="text-[10px] text-blue-200/50 uppercase tracking-widest mb-1 font-bold">
                System Status
              </p>
              <p className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/admin/billboards")}
              className="bg-primary hover:bg-blue-600 text-white rounded-xl px-5 py-3 font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            >
              <PlusCircle size={18} /> Add Billboard
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40 text-blue-400 animate-pulse font-bold text-xl">
            Syncing Dashboard...
          </div>
        ) : (
          <>
            <section>
              <div className="flex justify-between items-center mb-5 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Calendar size={20} className="text-purple-500" /> Live Schedule
                  </h2>
                  <p className="mt-1 text-sm text-blue-100/45">
                    Verified advertiser bookings with billboard media, ad creative preview, timing, and owner details.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/admin/schedule")}
                  className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
                >
                  View Full Schedule
                </button>
              </div>

              {liveBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 bg-[#131A2A]/40 border border-white/5 border-dashed rounded-3xl">
                  <Calendar size={36} className="text-white/10 mb-3" />
                  <p className="text-blue-200/40 text-sm">No verified bookings are scheduled yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {liveBookings.slice(0, 4).map((booking) => (
                    <button
                      key={booking._id}
                      type="button"
                      onClick={() => navigate("/admin/schedule")}
                      className="rounded-3xl border border-white/5 bg-[#131A2A]/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] text-left hover:border-purple-500/25 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                        <div>
                          <p className="text-xl font-black text-white">{booking.billboard?.name || "Unknown Billboard"}</p>
                          <p className="mt-1 text-sm text-blue-100/55">
                            {booking.billboard?.city}, {booking.billboard?.location}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                            booking.status === "active"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : booking.status === "completed"
                              ? "bg-blue-500/15 text-blue-300"
                              : "bg-teal-500/15 text-teal-300"
                          }`}
                        >
                          {getLiveStageLabel(booking)}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        <MediaPanel
                          title="Billboard"
                          url={buildMediaUrl(booking.billboard?.imageUrl)}
                          mediaType="image"
                          alt={booking.billboard?.name || "Billboard"}
                          fallbackIcon={Monitor}
                        />
                        <MediaPanel
                          title="Ad Creative"
                          url={buildMediaUrl(booking.ad?.mediaUrl)}
                          mediaType={booking.ad?.mediaType}
                          alt={booking.ad?.title || "Ad Creative"}
                          fallbackIcon={PlayCircle}
                        />
                      </div>

                      <div className="mt-5 grid gap-3 text-sm text-blue-100/65 md:grid-cols-2">
                        <p className="flex items-start gap-2">
                          <Calendar size={15} className="mt-0.5 text-purple-300" />
                          <span>{new Date(booking.date).toLocaleDateString("en-PK")}</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <Clock3 size={15} className="mt-0.5 text-purple-300" />
                          <span>{booking.timeSlot}</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <CreditCard size={15} className="mt-0.5 text-purple-300" />
                          <span>{formatPkr(booking.totalPrice)}</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <UserRound size={15} className="mt-0.5 text-purple-300" />
                          <span>{booking.advertiser?.name || "Unknown advertiser"}</span>
                        </p>
                        <p className="flex items-start gap-2 md:col-span-2">
                          <MapPin size={15} className="mt-0.5 text-purple-300" />
                          <span>
                            {booking.advertiser?.email || "No email"} · {booking.advertiser?.phone || "No phone"}
                          </span>
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <CreditCard size={20} className="text-cyan-500" /> Revenue Overview
                </h2>
                <button
                  type="button"
                  onClick={() => navigate("/admin/payments")}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  View Ledger
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: "Verified Revenue",
                    value: formatPkr(totalRevenue),
                    color: "text-emerald-400",
                    border: "border-emerald-500/20",
                    bg: "bg-emerald-500/5",
                    Icon: TrendingUp,
                  },
                  {
                    label: "Total Txns",
                    value: payments.length,
                    color: "text-blue-400",
                    border: "border-blue-500/20",
                    bg: "bg-blue-500/5",
                    Icon: Hash,
                  },
                  {
                    label: "Verified",
                    value: payments.filter((payment) => isVerifiedTransaction(payment)).length,
                    color: "text-cyan-400",
                    border: "border-cyan-500/20",
                    bg: "bg-cyan-500/5",
                    Icon: CheckCircle2,
                  },
                  {
                    label: "Awaiting Proof",
                    value: bookings.filter(
                      (booking) => booking.status === "approved" && booking.paymentStatus === "submitted"
                    ).length,
                    color: "text-amber-400",
                    border: "border-amber-500/20",
                    bg: "bg-amber-500/5",
                    Icon: AlertCircle,
                  },
                ].map(({ label, value, color, border, bg, Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => navigate("/admin/payments")}
                    className={`${bg} border ${border} rounded-2xl p-5 text-left hover:opacity-80 transition-opacity`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] font-black text-blue-200/40 uppercase tracking-widest">{label}</p>
                      <Icon size={14} className={color} />
                    </div>
                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Monitor size={20} className="text-primary" /> Operational Assets
                  </h2>
                  <p className="mt-1 text-sm text-blue-100/45">
                    Browse every billboard with photos and details, grouped the way you want.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/admin/billboards")}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Manage All
                </button>
              </div>

              <div className="rounded-3xl border border-white/5 bg-[#131A2A]/80 p-5 mb-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "all", label: "View All Billboards" },
                      { id: "city", label: "View City Wise" },
                      { id: "location", label: "View Location Wise" },
                      { id: "name", label: "View Name Wise" },
                    ].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setAssetView(option.id)}
                        className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition ${
                          assetView === option.id
                            ? "bg-blue-500 text-white"
                            : "bg-white/5 text-blue-100/55 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full lg:w-80">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      value={assetSearch}
                      onChange={(event) => setAssetSearch(event.target.value)}
                      placeholder="Search by name, city, location..."
                      className="w-full rounded-2xl border border-white/10 bg-[#0A0F1C]/80 py-3 pl-12 pr-4 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {billboards.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center text-center p-14 bg-[#131A2A]/40 border border-white/5 border-dashed rounded-3xl group hover:border-blue-500/30 hover:bg-[#131A2A]/60 transition-all duration-300 cursor-pointer"
                  onClick={() => navigate("/admin/billboards")}
                >
                  <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform text-blue-400">
                    <Monitor size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">No Billboards Yet</h2>
                  <p className="text-blue-100/50 max-w-md mx-auto mb-7 leading-relaxed">
                    Configure your digital displays, map their locations, and set pricing to start accepting bookings.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/admin/billboards")}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl px-8 py-4 font-bold flex items-center gap-3 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] transform hover:-translate-y-1"
                  >
                    <PlusCircle size={20} /> Add Billboard
                  </button>
                </motion.div>
              ) : groupedAssets.every((group) => group.items.length === 0) ? (
                <div className="flex flex-col items-center justify-center p-10 bg-[#131A2A]/40 border border-white/5 border-dashed rounded-3xl">
                  <Search size={34} className="text-white/20 mb-3" />
                  <p className="text-blue-200/45 text-sm">No billboards matched your current search.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {groupedAssets.map((group) => (
                    <div key={group.key}>
                      {assetView !== "all" && (
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-lg font-black text-white">{group.label}</h3>
                          <span className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100/40">
                            {group.items.length} billboard{group.items.length === 1 ? "" : "s"}
                          </span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {group.items.map((billboard) => (
                          <button
                            key={billboard._id}
                            type="button"
                            onClick={() => navigate("/admin/billboards")}
                            className="cursor-pointer bg-[#131A2A]/80 backdrop-blur-md border border-blue-500/10 rounded-2xl overflow-hidden hover:border-blue-500/40 transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.05)] hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] group flex flex-col text-left"
                          >
                            <div className="relative h-44 overflow-hidden bg-black/40 flex items-center justify-center">
                              {billboard.imageUrl ? (
                                <img
                                  src={buildMediaUrl(billboard.imageUrl)}
                                  alt={billboard.name}
                                  className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                                />
                              ) : (
                                <Monitor size={48} className="text-white/10" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1C] via-transparent to-transparent opacity-90" />
                              <span
                                className={`absolute top-4 right-4 text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border ${
                                  billboard.status === "active"
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                    : "bg-red-500/20 text-red-400 border-red-500/30"
                                }`}
                              >
                                {billboard.status}
                              </span>
                              <div className="absolute bottom-4 left-4 right-4">
                                <h3 className="text-lg font-bold text-white truncate">{billboard.name}</h3>
                                <p className="text-blue-200/70 text-xs flex items-center gap-1 mt-1 truncate">
                                  <MapPin size={10} className="text-primary" />
                                  {billboard.city}, {billboard.location}
                                </p>
                              </div>
                            </div>
                            <div className="p-4 border-t border-white/5 text-sm text-blue-100/60 space-y-2">
                              <div className="flex justify-between gap-4">
                                <span>Rate</span>
                                <span className="font-black text-cyan-300">
                                  {formatPkr(billboard.pricePerMinute || billboard.pricePerHour)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>Screen</span>
                                <span className="font-medium text-white">{billboard.size || "Digital Screen"}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>Resolution</span>
                                <span className="font-medium text-white">
                                  {billboard.resolution || "Not specified"}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

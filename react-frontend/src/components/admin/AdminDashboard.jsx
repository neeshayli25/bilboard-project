import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import {
  Monitor, CheckSquare, Users, DollarSign, Calendar, Clock,
  MapPin, AlertCircle, TrendingUp, ChevronRight, ArrowUpRight,
  CheckCircle, XCircle, PlusCircle
} from "lucide-react";
import {
  getDashboardStats, getRevenueTrend, getBillboards,
  getBookings, getUsers, getTransactions, getNotifications,
  getPendingAds, approveAd, rejectAd
} from "../../services/adminApi";

const CARD_CONFIGS = [
  { key: "totalBillboards",   label: "Total Billboards",    icon: Monitor,      bg: "#eef2ff", icon_color: "#6366f1", border: "#c7d2fe", trend: "Total registered" },
  { key: "totalAds",          label: "Running Ads",         icon: CheckSquare,  bg: "#f0fdf4", icon_color: "#10b981", border: "#bbf7d0", trend: "Active campaigns" },
  { key: "pendingApprovals",  label: "Pending Approvals",   icon: AlertCircle,  bg: "#fffbeb", icon_color: "#f59e0b", border: "#fde68a", trend: "Needs attention" },
  { key: "totalUsers",        label: "Total Users",         icon: Users,        bg: "#eff6ff", icon_color: "#3b82f6", border: "#bfdbfe", trend: "Registered users" },
];

function StatCard({ config, value, onClick }) {
  const Icon = config.icon;
  return (
    <div
      onClick={onClick}
      style={{ background: config.bg, border: `1px solid ${config.border}`, borderRadius: 16, padding: "20px 22px", cursor: "pointer", transition: "all .2s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>{config.label}</p>
          <p style={{ fontSize: 34, fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>{value ?? 0}</p>
          <p style={{ fontSize: 12, color: config.icon_color, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <ArrowUpRight size={12} /> {config.trend}
          </p>
        </div>
        <div style={{ background: config.icon_color + "20", borderRadius: 12, padding: 12 }}>
          <Icon size={22} color={config.icon_color} />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, color = "#6366f1" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
      <div style={{ background: color + "15", borderRadius: 10, padding: 8 }}>
        <Icon size={20} color={color} />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{title}</h2>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalBillboards: 0, totalAds: 0, pendingApprovals: 0, totalUsers: 0, pendingBookings: 0 });
  const [revenueData, setRevenueData] = useState([]);
  const [billboards, setBillboards] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [pendingAds, setPendingAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBillboard, setSelectedBillboard] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const billboardsRef = useRef(null);
  const bookingsRef   = useRef(null);
  const usersRef      = useRef(null);
  const approvalsRef  = useRef(null);
  const scheduleRef   = useRef(null);
  const paymentsRef   = useRef(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [sR, rR, bR, bkR, uR, tR, nR, pAR] = await Promise.all([
        getDashboardStats(),
        getRevenueTrend(),
        getBillboards(),
        getBookings(),
        getUsers(),
        getTransactions(),
        getNotifications(),
        getPendingAds()
      ]);
      setStats(sR.data);
      setRevenueData(rR.data);
      setBillboards(bR.data);
      setBookings(bkR.data);
      setUsers(uR.data);
      setTransactions(tR.data);
      setNotifications(nR.data?.slice(0, 5) || []);
      setPendingAds(pAR.data);
      if (bR.data?.length) setSelectedBillboard(bR.data[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAd = async (id) => {
    await approveAd(id);
    fetchDashboardData();
  };

  const handleRejectAd = async (id) => {
    await rejectAd(id);
    fetchDashboardData();
  };

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Running ads = approved bookings (you can adjust based on your logic)
  const runningAds = bookings.filter(b => b.status === "approved").length;
  const pendingApprovalsCount = stats.pendingApprovals;
  const totalBillboards = billboards.length;

  // Unique days from selected billboard's timeSlots
  const billboardDays = selectedBillboard?.timeSlots
    ? [...new Set(selectedBillboard.timeSlots.map(s => s.split(" ")[0]))]
    : [];
  const slotsForDay = (day) =>
    selectedBillboard?.timeSlots?.filter(s => s.startsWith(day)).map(s => s.split(" ").slice(1).join(" ")) || [];

  const pendingBookings = bookings.filter(b => b.status === "pending");
  const upcomingSchedule = bookings.filter(b => b.status === "approved" && new Date(b.date) >= new Date());

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", minHeight: 400 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "3px solid #e0e7ff", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#6366f1", fontWeight: 600 }}>Loading Dashboard...</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const card = (children, extraStyle = {}) => (
    <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e8edf5", padding: "24px", boxShadow: "0 2px 12px rgba(99,102,241,0.05)", ...extraStyle }}>
      {children}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Welcome Banner with Create Billboard Button */}
      <div style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)", borderRadius: 20, padding: "28px 32px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Welcome back, Admin 👋</h1>
          <p style={{ opacity: 0.85, fontSize: 14 }}>Here's what's happening with your billboard network today.</p>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 14, padding: "12px 20px", textAlign: "center", backdropFilter: "blur(8px)" }}>
            <p style={{ fontSize: 11, opacity: 0.8, letterSpacing: "0.08em" }}>TODAY</p>
            <p style={{ fontSize: 18, fontWeight: 700 }}>{new Date().toLocaleDateString("en-PK", { weekday: "short", month: "short", day: "numeric" })}</p>
          </div>
          <button
            onClick={() => navigate("/admin/billboards")}
            style={{ background: "#fff", color: "#6366f1", border: "none", borderRadius: 12, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all .2s" }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <PlusCircle size={18} /> Create Billboard
          </button>
        </div>
      </div>

      {/* KPI Cards (using computed values) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <StatCard
          config={{ ...CARD_CONFIGS[0], trend: `${totalBillboards} total` }}
          value={totalBillboards}
          onClick={() => scrollTo(billboardsRef)}
        />
        <StatCard
          config={{ ...CARD_CONFIGS[1], trend: `${runningAds} active` }}
          value={runningAds}
          onClick={() => scrollTo(bookingsRef)}
        />
        <StatCard
          config={{ ...CARD_CONFIGS[2], trend: `${pendingApprovalsCount} pending` }}
          value={pendingApprovalsCount}
          onClick={() => scrollTo(approvalsRef)}
        />
        <StatCard
          config={CARD_CONFIGS[3]}
          value={stats.totalUsers}
          onClick={() => scrollTo(usersRef)}
        />
      </div>

      {/* Charts + Pending Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {card(
          <>
            <SectionTitle icon={TrendingUp} title="Revenue Trend" color="#6366f1" />
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#rg)" dot={{ fill: "#6366f1", strokeWidth: 2, r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}

        {card(
          <>
            <SectionTitle icon={AlertCircle} title="Pending Actions" color="#f59e0b" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Ad Approvals", count: pendingAds.length, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", onClick: () => scrollTo(approvalsRef) },
                { label: "Booking Requests", count: stats.pendingBookings, color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", onClick: () => scrollTo(bookingsRef) },
                { label: "Unread Notifications", count: notifications.filter(n => !n.isRead).length, color: "#ec4899", bg: "#fdf2f8", border: "#fbcfe8", onClick: () => navigate("/admin/notifications") },
                { label: "Pending Payments", count: transactions.filter(t => t.status === "pending").length, color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0", onClick: () => scrollTo(paymentsRef) },
              ].map(item => (
                <div
                  key={item.label}
                  onClick={item.onClick}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: item.bg, border: `1px solid ${item.border}`, borderRadius: 12, cursor: "pointer", transition: "all .15s" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "translateX(4px)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "none"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                    <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 14 }}>{item.label}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ background: item.color, color: "#fff", borderRadius: 20, padding: "2px 10px", fontWeight: 700, fontSize: 13 }}>{item.count}</span>
                    <ChevronRight size={14} color={item.color} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Billboards */}
      <div ref={billboardsRef}>
        {card(
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <SectionTitle icon={Monitor} title="Billboards" color="#0ea5e9" />
              <button onClick={() => navigate("/admin/billboards")} style={{ fontSize: 13, color: "#6366f1", background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 8, padding: "6px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                Manage All <ChevronRight size={14} />
              </button>
            </div>
            {billboards.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>No billboards added yet.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 18 }}>
                {billboards.map(b => (
                  <div
                    key={b._id}
                    onClick={() => { setSelectedBillboard(b); setSelectedDay(null); }}
                    style={{ border: selectedBillboard?._id === b._id ? "2px solid #6366f1" : "1px solid #e8edf5", borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "all .2s", background: selectedBillboard?._id === b._id ? "#fafbff" : "#fff" }}
                    onMouseEnter={e => { if (selectedBillboard?._id !== b._id) e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)"; }}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                  >
                    <div style={{ position: "relative", height: 150 }}>
                      <img
                        src={b.imageUrl || `https://picsum.photos/seed/${b._id}/300/200`}
                        alt={b.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={e => { e.target.src = "https://picsum.photos/300/200"; }}
                      />
                      <span style={{ position: "absolute", top: 10, right: 10, background: b.status === "active" ? "#10b981" : "#94a3b8", color: "#fff", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>
                        {b.status}
                      </span>
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      <h3 style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 6 }}>{b.name}</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                        <MapPin size={12} color="#6366f1" /> {b.city}, {b.location}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#6366f1" }}>PKR {b.pricePerHour}/hr</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Time Slot Viewer */}
            {selectedBillboard && (
              <div style={{ marginTop: 24, padding: "20px 22px", background: "#f8faff", borderRadius: 14, border: "1px solid #e0e7ff" }}>
                <p style={{ fontWeight: 700, fontSize: 15, color: "#1e1b4b", marginBottom: 14 }}>
                  📅 Time Slots — <span style={{ color: "#6366f1" }}>{selectedBillboard.name}</span>
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  {billboardDays.length === 0 ? (
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>No days configured for this billboard.</span>
                  ) : billboardDays.map(day => (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                      style={{ padding: "7px 16px", borderRadius: 30, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", transition: "all .15s",
                        background: selectedDay === day ? "#6366f1" : "#e0e7ff",
                        color: selectedDay === day ? "#fff" : "#6366f1" }}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
                {selectedDay && (
                  <div>
                    <p style={{ fontSize: 12, color: "#64748b", marginBottom: 10, fontWeight: 600 }}>Available slots on {selectedDay}:</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {slotsForDay(selectedDay).map(slot => (
                        <span key={slot} style={{ padding: "8px 14px", background: "#fff", border: "1px solid #c7d2fe", borderRadius: 10, fontSize: 13, color: "#4338ca", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                          <Clock size={13} /> {slot}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Pending Ad Approvals with Action Buttons */}
      {pendingAds.length > 0 && (
        <div ref={approvalsRef}>
          {card(
            <>
              <SectionTitle icon={AlertCircle} title="Pending Ad Approvals" color="#f59e0b" />
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {pendingAds.map(ad => (
                  <div key={ad._id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12 }}>
                    <AlertCircle size={18} color="#f59e0b" />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: "#92400e" }}>{ad.title}</span>
                      <span style={{ fontSize: 12, color: "#f59e0b", marginLeft: 8 }}>Pending</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleApproveAd(ad._id)}
                        style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectAd(ad._id)}
                        style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Bookings (All Bookings) */}
      <div ref={bookingsRef}>
        {card(
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <SectionTitle icon={Calendar} title="All Bookings" color="#8b5cf6" />
              <div style={{ display: "flex", gap: 6 }}>
                {["all", "pending", "approved", "rejected"].map(f => (
                  <button key={f} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "1px solid #e0e7ff", background: "#eef2ff", color: "#6366f1", cursor: "pointer", textTransform: "capitalize" }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {bookings.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8" }}>No bookings yet.</div>
              ) : bookings.map(b => (
                <div key={b._id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", background: "#fafbff", border: "1px solid #e8edf5", borderRadius: 14, flexWrap: "wrap" }}>
                  {b.ad?.mediaUrl ? (
                    b.ad.mediaType === "image"
                      ? <img src={`http://localhost:5000${b.ad.mediaUrl}`} style={{ width: 70, height: 60, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} alt="ad" />
                      : <video src={`http://localhost:5000${b.ad.mediaUrl}`} style={{ width: 70, height: 60, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} muted />
                  ) : (
                    <div style={{ width: 70, height: 60, background: "#e0e7ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Monitor size={22} color="#6366f1" />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{b.billboard?.name || "N/A"}</span>
                      <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, fontWeight: 600,
                        background: b.status === "approved" ? "#f0fdf4" : b.status === "rejected" ? "#fef2f2" : "#fffbeb",
                        color: b.status === "approved" ? "#10b981" : b.status === "rejected" ? "#ef4444" : "#f59e0b" }}>
                        {b.status}
                      </span>
                      <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, fontWeight: 600,
                        background: b.paymentStatus === "paid" ? "#f0fdf4" : "#fffbeb",
                        color: b.paymentStatus === "paid" ? "#10b981" : "#f59e0b" }}>
                        {b.paymentStatus || "unpaid"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#64748b", flexWrap: "wrap" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={12} /> {new Date(b.date).toLocaleDateString()}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {b.timeSlot}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {b.billboard?.city}</span>
                      <span style={{ fontWeight: 700, color: "#6366f1" }}>PKR {b.totalPrice}</span>
                    </div>
                    {b.advertiser?.name && <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>By: {b.advertiser.name}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Users */}
      <div ref={usersRef}>
        {card(
          <>
            <SectionTitle icon={Users} title="Users" color="#3b82f6" />
            <div style={{ overflowY: "auto", maxHeight: 320, borderRadius: 12, border: "1px solid #e8edf5" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead style={{ position: "sticky", top: 0, background: "#f8faff" }}>
                  <tr>
                    {["#", "Name", "Email", "Role", "Status"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", borderBottom: "1px solid #e8edf5" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u._id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background .15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8faff"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "12px 16px", color: "#94a3b8" }}>{i + 1}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#6366f1" }}>{u.name?.[0]?.toUpperCase()}</div>
                          <span style={{ fontWeight: 600, color: "#0f172a" }}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>{u.email}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ background: "#e0e7ff", color: "#4338ca", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>{u.role}</span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ background: u.isActive ? "#f0fdf4" : "#fef2f2", color: u.isActive ? "#10b981" : "#ef4444", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Upcoming Schedules */}
      <div ref={scheduleRef}>
        {card(
          <>
            <SectionTitle icon={Calendar} title="Upcoming Schedules" color="#8b5cf6" />
            {upcomingSchedule.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color:"#94a3b8" }}>No upcoming schedules.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
                {upcomingSchedule.map(b => (
                  <div key={b._id} style={{ padding: "16px 18px", background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14, color: "#581c87" }}>{b.ad?.title || "Ad Campaign"}</p>
                        <p style={{ fontSize: 12, color: "#7c3aed", marginTop: 2 }}>{b.billboard?.name}</p>
                      </div>
                      <span style={{ background: "#7c3aed", color: "#fff", fontSize: 10, padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>SCHEDULED</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {[
                        { icon: Calendar, text: new Date(b.date).toLocaleDateString() },
                        { icon: Clock,    text: b.timeSlot },
                        { icon: MapPin,   text: b.billboard?.city },
                        { icon: DollarSign, text: `PKR ${b.totalPrice}` },
                      ].map(({ icon: Icon, text }, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6d28d9" }}>
                          <Icon size={12} /> {text}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Payments & Transactions */}
      <div ref={paymentsRef}>
        {card(
          <>
            <SectionTitle icon={DollarSign} title="Payments & Transactions" color="#ec4899" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
              {[
                { label: "Total Revenue",    value: `PKR ${transactions.filter(t => t.status === "paid").reduce((s, t) => s + (t.amount || 0), 0).toLocaleString()}`, color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
                { label: "Paid",             value: transactions.filter(t => t.status === "paid").length,    color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
                { label: "Pending",          value: transactions.filter(t => t.status === "pending").length, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
              ].map(item => (
                <div key={item.label} style={{ background: item.bg, border: `1px solid ${item.border}`, borderRadius: 12, padding: "14px 18px" }}>
                  <p style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{item.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.value}</p>
                </div>
              ))}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#fdf2f8" }}>
                    {["Invoice", "Advertiser", "Amount", "Method", "Date", "Status"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 14px", fontWeight: 600, color: "#0f172a" }}>{t.invoiceNumber || "#" + t._id?.slice(-6)}</td>
                      <td style={{ padding: "12px 14px", color: "#64748b" }}>{t.advertiser?.name || "—"}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: "#ec4899" }}>PKR {t.amount?.toLocaleString()}</td>
                      <td style={{ padding: "12px 14px", color: "#64748b", textTransform: "capitalize" }}>{t.method}</td>
                      <td style={{ padding: "12px 14px", color: "#64748b" }}>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: t.status === "paid" ? "#f0fdf4" : "#fffbeb",
                          color: t.status === "paid" ? "#10b981" : "#f59e0b" }}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
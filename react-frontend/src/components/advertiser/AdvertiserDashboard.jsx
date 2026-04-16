import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, DollarSign, Calendar, Image, CheckCircle, Clock, PlusCircle,
  MapPin, Monitor, Bell, CreditCard, AlertCircle, ChevronRight, ArrowUpRight,
  XCircle, User, Phone
} from "lucide-react";
import {
  getAdvertiserStats, getMyBookings, getMyAds, getAllBillboards,
  getNotifications, getPayments
} from "../../api";

const StatCard = ({ title, value, icon, color, trend }) => {
  const colors = {
    blue: "bg-gradient-to-br from-blue-500 to-cyan-600",
    green: "bg-gradient-to-br from-emerald-500 to-teal-600",
    purple: "bg-gradient-to-br from-purple-500 to-pink-600",
    orange: "bg-gradient-to-br from-orange-500 to-amber-600",
    indigo: "bg-gradient-to-br from-indigo-500 to-purple-600",
  };
  return (
    <div className={`rounded-2xl p-5 ${colors[color]} text-white shadow-md hover:shadow-lg transition`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend && <p className="text-white/80 text-xs mt-1 flex items-center gap-1"><ArrowUpRight size={12} /> {trend}</p>}
        </div>
        <div className="bg-white/20 p-2 rounded-full">{icon}</div>
      </div>
    </div>
  );
};

const SectionHeader = ({ title, icon, onAction, actionLabel }) => (
  <div className="flex justify-between items-center mb-4">
    <div className="flex items-center gap-2">
      <div className="p-2 bg-indigo-50 rounded-lg">{icon}</div>
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
    </div>
    {onAction && (
      <button onClick={onAction} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
        {actionLabel} <ChevronRight size={14} />
      </button>
    )}
  </div>
);

export default function AdvertiserDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalAds: 0, activeCampaigns: 0, totalSpend: 0, pendingApprovals: 0 });
  const [billboards, setBillboards] = useState([]);
  const [myAds, setMyAds] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBillboard, setSelectedBillboard] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [filterAdStatus, setFilterAdStatus] = useState("all");
  const [filterBookingStatus, setFilterBookingStatus] = useState("all");

  const billboardsRef = useRef(null);
  const myAdsRef = useRef(null);
  const bookingsRef = useRef(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, billboardsRes, adsRes, bookingsRes, notifRes, paymentsRes] = await Promise.all([
        getAdvertiserStats(),
        getAllBillboards(),
        getMyAds(),
        getMyBookings(),
        getNotifications(),
        getPayments(),
      ]);
      setStats(statsRes.data);
      setBillboards(billboardsRes.data || []);
      setMyAds(adsRes.data || []);
      setBookings(bookingsRes.data || []);
      setNotifications(notifRes.data?.slice(0, 5) || []);
      setTransactions(paymentsRes.data || []);
      if (billboardsRes.data?.length) setSelectedBillboard(billboardsRes.data[0]);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status, type = "booking") => {
    if (type === "ad") {
      if (status === "approved") return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"><CheckCircle size={12} /> Approved</span>;
      if (status === "rejected") return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"><XCircle size={12} /> Rejected</span>;
      return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"><Clock size={12} /> Pending</span>;
    } else {
      if (status === "approved") return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Approved</span>;
      if (status === "rejected") return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">Rejected</span>;
      if (status === "completed") return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">Completed</span>;
      return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium">Pending</span>;
    }
  };

  const filteredAds = myAds.filter(ad => filterAdStatus === "all" || ad.approvalStatus === filterAdStatus);
  const filteredBookings = bookings.filter(b => filterBookingStatus === "all" || b.status === filterBookingStatus);
  const upcomingBookings = bookings.filter(b => b.status === "approved" && new Date(b.date) >= new Date());

  if (loading) return (
    <div className="flex justify-center items-center h-96">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-indigo-600 font-medium">Loading dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Welcome Banner with Create Booking Button */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, Advertiser 👋</h1>
            <p className="text-white/80 mt-1">Manage your campaigns and track performance</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
              <p className="text-xs opacity-80">TODAY</p>
              <p className="text-lg font-semibold">{new Date().toLocaleDateString("en-PK", { weekday: "short", month: "short", day: "numeric" })}</p>
            </div>
            <button
              onClick={() => navigate("/advertiser/create-booking")}
              className="bg-white text-indigo-700 hover:bg-indigo-50 px-5 py-2 rounded-xl flex items-center gap-2 font-semibold shadow-md transition"
            >
              <PlusCircle size={18} /> Create Booking
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Ads" value={stats.totalAds} icon={<Image size={22} />} color="blue" trend="Uploaded by you" />
        <StatCard title="Active Campaigns" value={stats.activeCampaigns} icon={<TrendingUp size={22} />} color="green" trend="Currently running" />
        <StatCard title="Total Spend" value={`PKR ${stats.totalSpend.toLocaleString()}`} icon={<DollarSign size={22} />} color="purple" />
        <StatCard title="Pending Approvals" value={stats.pendingApprovals} icon={<Clock size={22} />} color="orange" trend="Waiting for review" />
      </div>

      {/* Billboards Section with Admin Details */}
      <div ref={billboardsRef} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <SectionHeader
          title="Available Billboards"
          icon={<Monitor size={20} className="text-indigo-600" />}
          onAction={() => navigate("/advertiser/billboards")}
          actionLabel="View All"
        />
        {billboards.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No billboards available yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {billboards.slice(0, 3).map(b => (
                <div
                  key={b._id}
                  onClick={() => { setSelectedBillboard(b); setSelectedDay(null); }}
                  className={`border rounded-xl overflow-hidden cursor-pointer transition hover:shadow-md ${selectedBillboard?._id === b._id ? "ring-2 ring-indigo-500" : ""}`}
                >
                  <img src={b.imageUrl || "https://picsum.photos/seed/1/300/160"} alt={b.name} className="h-32 w-full object-cover" />
                  <div className="p-3">
                    <h3 className="font-bold text-gray-800">{b.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin size={12} /> {b.city}, {b.location}</p>
                    <p className="text-indigo-600 font-bold mt-1">PKR {b.pricePerHour}/hour</p>
                    {/* Admin details */}
                    {b.createdBy && (
                      <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                        <div className="flex items-center gap-1"><User size={12} className="text-indigo-400" /> Added by: {b.createdBy.name}</div>
                        {b.createdBy.easypaisaNumber && (
                          <div className="flex items-center gap-1"><Phone size={12} className="text-indigo-400" /> Easypaisa: {b.createdBy.easypaisaNumber}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {selectedBillboard && (
              <div className="mt-5 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <p className="font-semibold text-gray-800 mb-2">⏰ Time Slots — {selectedBillboard.name}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[...new Set(selectedBillboard.timeSlots?.map(s => s.split(" ")[0]) || [])].map(day => (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition ${selectedDay === day ? "bg-indigo-600 text-white" : "bg-white text-indigo-600 border border-indigo-200"}`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
                {selectedDay && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Slots on {selectedDay}:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedBillboard.timeSlots?.filter(s => s.startsWith(selectedDay)).map(slot => (
                        <span key={slot} className="bg-white px-3 py-1 rounded-full text-xs text-indigo-700 border border-indigo-200 flex items-center gap-1"><Clock size={12} /> {slot.split(" ").slice(1).join(" ")}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* My Ads Section */}
      <div ref={myAdsRef} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex justify-between items-center mb-4">
          <SectionHeader title="My Advertisements" icon={<Image size={20} className="text-indigo-600" />} onAction={() => navigate("/advertiser/my-ads")} actionLabel="Manage Ads" />
          <div className="flex gap-2">
            {["all", "pending", "approved", "rejected"].map(status => (
              <button key={status} onClick={() => setFilterAdStatus(status)} className={`px-2 py-1 text-xs rounded-full capitalize ${filterAdStatus === status ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"}`}>
                {status}
              </button>
            ))}
          </div>
        </div>
        {filteredAds.length === 0 ? (
          <p className="text-center text-gray-500 py-6">No ads found. <button onClick={() => navigate("/advertiser/upload")} className="text-indigo-600 underline">Upload one</button></p>
        ) : (
          <div className="space-y-3">
            {filteredAds.slice(0, 3).map(ad => (
              <div key={ad._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                {ad.mediaType === "image" ? (
                  <img src={`http://localhost:5000${ad.mediaUrl}`} className="w-12 h-12 rounded-lg object-cover" alt={ad.title} />
                ) : (
                  <video src={`http://localhost:5000${ad.mediaUrl}`} className="w-12 h-12 rounded-lg object-cover" muted />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{ad.title}</p>
                  <p className="text-xs text-gray-500">Uploaded: {new Date(ad.createdAt).toLocaleDateString()}</p>
                </div>
                {getStatusBadge(ad.approvalStatus, "ad")}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Bookings Section */}
      <div ref={bookingsRef} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex justify-between items-center mb-4">
          <SectionHeader title="My Bookings" icon={<Calendar size={20} className="text-indigo-600" />} onAction={() => navigate("/advertiser/my-bookings")} actionLabel="View All" />
          <div className="flex gap-2">
            {["all", "pending", "approved", "rejected", "completed"].map(status => (
              <button key={status} onClick={() => setFilterBookingStatus(status)} className={`px-2 py-1 text-xs rounded-full capitalize ${filterBookingStatus === status ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"}`}>
                {status}
              </button>
            ))}
          </div>
        </div>
        {filteredBookings.length === 0 ? (
          <p className="text-center text-gray-500 py-6">No bookings yet. <button onClick={() => navigate("/advertiser/create-booking")} className="text-indigo-600 underline">Create one</button></p>
        ) : (
          <div className="space-y-3">
            {filteredBookings.slice(0, 3).map(b => (
              <div key={b._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium">{b.billboard?.name}</p>
                  <p className="text-xs text-gray-500">{new Date(b.date).toLocaleDateString()} • {b.timeSlot}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(b.status, "booking")}
                  {b.paymentStatus === "submitted" && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Payment Submitted</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Schedules */}
      {upcomingBookings.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <SectionHeader title="Upcoming Schedules" icon={<Calendar size={20} className="text-purple-600" />} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcomingBookings.map(b => (
              <div key={b._id} className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                <p className="font-semibold text-purple-800">{b.billboard?.name}</p>
                <div className="flex justify-between text-sm text-purple-700 mt-1">
                  <span>{new Date(b.date).toLocaleDateString()}</span>
                  <span>{b.timeSlot}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications & Payments Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifications */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <SectionHeader title="Recent Notifications" icon={<Bell size={20} className="text-orange-500" />} onAction={() => navigate("/advertiser/notifications")} actionLabel="View All" />
          {notifications.length === 0 ? (
            <p className="text-gray-500 text-center py-6">No notifications yet.</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {notifications.map(n => (
                <div key={n._id} className="flex gap-3 p-2 border-b border-gray-100">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{n.title}</p>
                    <p className="text-xs text-gray-500">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <SectionHeader title="Payment Activity" icon={<CreditCard size={20} className="text-emerald-500" />} />
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500">Total Paid</p>
              <p className="text-xl font-bold text-emerald-700">PKR {transactions.filter(t => t.status === "completed").reduce((s, t) => s + (t.amount || 0), 0).toLocaleString()}</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-xl font-bold text-yellow-700">{transactions.filter(t => t.status !== "completed").length}</p>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {transactions.slice(0, 3).map(t => (
              <div key={t._id} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <p className="text-xs text-gray-500">{t.method}</p>
                  <p className="text-sm font-medium">PKR {t.amount?.toLocaleString()}</p>
                </div>
                <span className={`text-xs ${t.status === "completed" ? "text-green-600" : "text-yellow-600"}`}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 lg:hidden">
        <button onClick={() => navigate("/advertiser/create-booking")} className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition">
          <PlusCircle size={24} />
        </button>
      </div>
    </div>
  );
}
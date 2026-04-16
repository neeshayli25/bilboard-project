import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Monitor,
  ChevronDown,
} from "lucide-react";
import { getBookings, updateBookingStatus } from "../../services/adminApi";

const AdminSchedule = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBillboard, setFilterBillboard] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await getBookings();
      setBookings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    await updateBookingStatus(id, newStatus);
    loadBookings();
  };

  const uniqueBillboards = ["all", ...new Set(bookings.map(b => b.billboard?.name).filter(Boolean))];

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      (b.advertiser?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.billboard?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b._id || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || b.status === filterStatus;
    const matchesBillboard = filterBillboard === "all" || b.billboard?.name === filterBillboard;
    const matchesDate = !dateFilter || new Date(b.date).toDateString() === new Date(dateFilter).toDateString();
    return matchesSearch && matchesStatus && matchesBillboard && matchesDate;
  });

  const formatDate = (date) => new Date(date).toLocaleDateString();
  const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    confirmed: "bg-green-100 text-green-800 border-green-300",
    cancelled: "bg-red-100 text-red-800 border-red-300",
    completed: "bg-blue-100 text-blue-800 border-blue-300",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-gray-800">Schedule Manager</h1>
        <p className="text-gray-500 mt-1">Manage all billboard bookings and slots</p>
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-5"
      >
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by advertiser, billboard, or booking ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-5 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center gap-2 transition-all"
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
              className="overflow-hidden mt-4 pt-4 border-t border-gray-200"
            >
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Billboard</label>
                  <select
                    value={filterBillboard}
                    onChange={(e) => setFilterBillboard(e.target.value)}
                    className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    {uniqueBillboards.map(b => (
                      <option key={b} value={b}>{b === 'all' ? 'All Billboards' : b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Bookings Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading schedule...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No bookings found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-600">Booking ID</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-600">Advertiser</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-600">Billboard</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-600">Location</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-600">Date</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-600">Time Slot</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-600">Amount</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking._id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{booking._id.slice(-6)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{booking.advertiser?.name || "N/A"}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{booking.billboard?.name || "N/A"}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{booking.billboard?.city || "N/A"}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{formatDate(booking.date)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{booking.timeSlot || "Full day"}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">PKR {booking.totalPrice?.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[booking.status] || statusColors.pending}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {booking.status === "pending" && (
                          <>
                            <button
                              onClick={() => updateStatus(booking._id, "confirmed")}
                              className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                              title="Confirm"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => updateStatus(booking._id, "cancelled")}
                              className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                              title="Cancel"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        {booking.status === "confirmed" && (
                          <button
                            onClick={() => updateStatus(booking._id, "completed")}
                            className="p-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                            title="Mark Completed"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm">Total Bookings</p>
          <p className="text-2xl font-bold">{bookings.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm">Pending</p>
          <p className="text-2xl font-bold">{bookings.filter(b => b.status === "pending").length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm">Confirmed</p>
          <p className="text-2xl font-bold">{bookings.filter(b => b.status === "confirmed").length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm">Completed</p>
          <p className="text-2xl font-bold">{bookings.filter(b => b.status === "completed").length}</p>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminSchedule;
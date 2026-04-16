import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, DollarSign, Clock, Filter, RefreshCw } from "lucide-react";
import { getMyBookings } from "../../api";

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await getMyBookings();
      setBookings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    const matchesSearch = b.billboard?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.billboard?.city?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status) => {
    const config = {
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      pending: "bg-yellow-100 text-yellow-700",
      completed: "bg-blue-100 text-blue-700",
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config[status] || config.pending}`}>{status}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Bookings</h1>
          <p className="text-gray-500 mt-1">Track your billboard reservations</p>
        </div>
        <button onClick={fetchBookings} className="p-2 text-gray-500 hover:text-indigo-600 transition">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by billboard or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <MapPin size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-4 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No bookings yet.</p>
          <button className="mt-2 text-indigo-600 hover:underline">Create your first booking</button>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No matching bookings found.</div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map(booking => (
            <div key={booking._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">{booking.billboard?.name}</h3>
                    {getStatusBadge(booking.status)}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-indigo-500" />
                      {new Date(booking.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-indigo-500" />
                      {booking.timeSlot}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-indigo-500" />
                      {booking.billboard?.city}, {booking.billboard?.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} className="text-indigo-500" />
                      <span className="font-semibold text-indigo-600">PKR {booking.totalPrice}</span>
                    </div>
                  </div>
                  {booking.paymentStatus === "submitted" && (
                    <div className="mt-2 text-xs text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded">Payment submitted – awaiting admin verification</div>
                  )}
                </div>
                {booking.status === "pending" && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1 text-xs text-yellow-700">
                    Awaiting approval
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
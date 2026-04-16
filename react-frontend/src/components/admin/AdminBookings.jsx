import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Eye, Calendar, MapPin, DollarSign, Clock, User } from "lucide-react";
import { getBookings, approveBooking, rejectBooking } from "../../services/adminApi";

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, pending, submitted, approved

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
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

  const handleApprove = async (id) => {
    await approveBooking(id);
    fetchBookings();
  };

  const handleReject = async (id) => {
    await rejectBooking(id);
    fetchBookings();
  };

  const filteredBookings = bookings.filter(b => {
    if (filter === "all") return true;
    if (filter === "pending") return b.status === "pending";
    if (filter === "submitted") return b.paymentStatus === "submitted";
    if (filter === "approved") return b.status === "approved";
    return true;
  });

  const getStatusBadge = (status, paymentStatus) => {
    if (status === "approved") return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">Approved</span>;
    if (status === "rejected") return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs">Rejected</span>;
    if (paymentStatus === "submitted") return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">Payment Submitted</span>;
    return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs">Pending</span>;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Booking Management</h1>
        <div className="flex gap-2">
          {["all", "pending", "submitted", "approved"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl capitalize ${filter === f ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading bookings...</div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">No bookings found.</div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map(booking => (
            <div key={booking._id} className="bg-white rounded-xl shadow-md border border-gray-100 p-5 hover:shadow-lg transition">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold">{booking.billboard?.name}</h3>
                    {getStatusBadge(booking.status, booking.paymentStatus)}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2"><MapPin size={14} className="text-indigo-500" /> {booking.billboard?.city}</div>
                    <div className="flex items-center gap-2"><Calendar size={14} className="text-indigo-500" /> {new Date(booking.date).toLocaleDateString()}</div>
                    <div className="flex items-center gap-2"><DollarSign size={14} className="text-indigo-500" /> PKR {booking.totalPrice}</div>
                    <div className="flex items-center gap-2"><Clock size={14} className="text-indigo-500" /> {booking.timeSlot}</div>
                    <div className="flex items-center gap-2"><User size={14} className="text-indigo-500" /> {booking.advertiser?.name}</div>
                  </div>
                  {booking.paymentProof && (
                    <div className="mt-2 text-xs text-gray-500">Transaction ID: {booking.paymentProof}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  {(booking.paymentStatus === "submitted" || booking.status === "pending") && (
                    <>
                      <button onClick={() => handleApprove(booking._id)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        <CheckCircle size={16} /> Approve
                      </button>
                      <button onClick={() => handleReject(booking._id)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        <XCircle size={16} /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
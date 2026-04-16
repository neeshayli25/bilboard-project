import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  DollarSign,
  User,
  Calendar,
  Hash,
  CheckCircle,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { getTransactions, updateTransactionStatus } from "../../services/adminApi";

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await getTransactions();
      setPayments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (id) => {
    await updateTransactionStatus(id, "completed");
    loadTransactions(); // refresh list
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      (p.advertiser?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p._id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1 },
  };

  const shimmerStyle = `
    @keyframes shimmer {
      0% { background-position: -1000px 0; }
      100% { background-position: 1000px 0; }
    }
    .shimmer {
      background: linear-gradient(90deg, transparent, rgba(255,215,0,0.2), transparent);
      background-size: 1000px 100%;
      animation: shimmer 3s infinite;
    }
  `;

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 p-6">
      <style>{shimmerStyle}</style>

      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="mb-8"
      >
        <h1 className="text-5xl font-extrabold text-yellow-900 drop-shadow-lg flex items-center gap-3">
          <Sparkles className="w-10 h-10 text-yellow-200" />
          Payments
        </h1>
        <p className="text-yellow-800 mt-2 text-lg">Track all financial transactions</p>
      </motion.div>

      {/* Search & Filter Bar */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8 bg-yellow-800/90 backdrop-blur-sm rounded-3xl p-5 border border-yellow-600 shadow-xl"
      >
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-yellow-300 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by advertiser, invoice number, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-yellow-100 border border-yellow-300 rounded-2xl text-gray-800 placeholder-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-5 py-4 bg-yellow-200 hover:bg-yellow-300 rounded-2xl flex items-center gap-2 transition-all text-yellow-900"
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
              className="overflow-hidden mt-4 pt-4 border-t border-yellow-600"
            >
              <div className="flex gap-3 flex-wrap">
                {["all", "completed", "pending", "failed", "refunded"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-full capitalize font-medium ${
                      filterStatus === status
                        ? "bg-yellow-500 text-white"
                        : "bg-yellow-700 text-yellow-200 hover:bg-yellow-600"
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

      {/* Payments List */}
      {loading ? (
        <div className="text-center py-12 text-yellow-800">Loading transactions...</div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          <AnimatePresence mode="popLayout">
            {filteredPayments.map((payment) => (
              <motion.div
                key={payment._id}
                variants={itemVariants}
                layout
                exit={{ opacity: 0, x: -100 }}
                whileHover={{
                  scale: 1.02,
                  boxShadow: "0 10px 30px -10px rgba(255, 215, 0, 0.6)",
                }}
                className="relative bg-gradient-to-r from-yellow-200 to-amber-100 p-5 rounded-3xl overflow-hidden border-2 border-yellow-400 shadow-lg"
              >
                <div className="absolute inset-0 shimmer pointer-events-none" />
                <div className="flex flex-wrap gap-4 justify-between items-start relative z-10">
                  {/* Left section - ID and status */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-yellow-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {payment.invoiceNumber?.slice(-3) || payment._id.slice(-3)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-yellow-900">
                        {payment.invoiceNumber || `TXN-${payment._id.slice(-6)}`}
                      </h3>
                      <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${
                        payment.status === "completed" ? "bg-green-600 text-white" :
                        payment.status === "pending" ? "bg-amber-500 text-white" :
                        payment.status === "failed" ? "bg-red-600 text-white" :
                        "bg-gray-600 text-white"
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>

                  {/* Middle section - details */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-yellow-800">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-yellow-700" />
                      <span className="font-medium">{payment.advertiser?.name || "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-yellow-700" />
                      <span>{payment.booking?._id?.slice(-6) || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-yellow-700" />
                      <span className="font-bold">{formatCurrency(payment.amount)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-yellow-700" />
                      <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Right section - action */}
                  {payment.status === "pending" && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => markAsPaid(payment._id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full text-sm font-medium flex items-center gap-1 shadow-md"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark Paid
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {!loading && filteredPayments.length === 0 && (
        <div className="text-center py-12 text-yellow-800">No payments found.</div>
      )}

      {/* Summary footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 p-5 bg-yellow-800/90 backdrop-blur-sm rounded-3xl border border-yellow-600 shadow-xl"
      >
        <div className="flex justify-between items-center text-yellow-100">
          <span className="font-medium">Filtered Payments:</span>
          <span className="text-xl font-bold">{filteredPayments.length}</span>
        </div>
        <div className="flex justify-between items-center text-yellow-100 mt-2">
          <span className="font-medium">Total Amount:</span>
          <span className="text-xl font-bold">
            {formatCurrency(filteredPayments.reduce((sum, p) => sum + p.amount, 0))}
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminPayments;
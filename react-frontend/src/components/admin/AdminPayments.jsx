import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  CreditCard,
  DollarSign,
  Hash,
  Search,
  TrendingUp,
  User,
} from "lucide-react";
import { getTransactions } from "../../services/adminApi";

const STATUS = {
  completed: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    label: "Verified",
  },
  paid: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    label: "Verified",
  },
  pending: {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    label: "Pending",
  },
  requires_action: {
    color: "text-sky-300",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    label: "Proof Submitted",
  },
  failed: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    label: "Failed",
  },
  refunded: {
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    label: "Refunded",
  },
};

const fmt = (value) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
  }).format(value || 0);

function isVerifiedTransaction(payment) {
  return payment.status === "completed" || payment.status === "paid" || payment.paymentStatus === "paid";
}

function getMethodLabel(payment) {
  const method = payment?.method || payment?.gateway || "bank_transfer";
  if (method === "easypaisa") return "Easypaisa";
  if (method === "jazzcash") return "JazzCash";
  if (method === "bank_transfer") return "Bank Transfer";
  return method;
}

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getTransactions();
        setPayments(res.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filtered = payments.filter((payment) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      (payment.advertiser?.name || "").toLowerCase().includes(term) ||
      (payment._id || "").toLowerCase().includes(term) ||
      (payment.invoiceNumber || "").toLowerCase().includes(term) ||
      (payment.gatewayTransactionId || "").toLowerCase().includes(term) ||
      (payment.gatewayReference || "").toLowerCase().includes(term);

    const matchStatus = filterStatus === "all" || (payment.status || payment.paymentStatus) === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalRevenue = payments
    .filter((payment) => isVerifiedTransaction(payment))
    .reduce((sum, payment) => sum + (payment.amount || payment.totalPrice || 0), 0);

  const pendingRevenue = payments
    .filter(
      (payment) =>
        ["pending", "requires_action"].includes(payment.status) ||
        ["pending", "requires_action"].includes(payment.paymentStatus)
    )
    .reduce((sum, payment) => sum + (payment.amount || payment.totalPrice || 0), 0);

  return (
    <div className="flex flex-col gap-6 h-full bg-darkBg text-textMain relative pb-16 min-h-screen">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute w-[500px] h-[500px] bg-cyan-600 opacity-5 blur-[120px] top-20 right-10 rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-black text-white flex items-center gap-3">
              <CreditCard className="text-cyan-500" /> Payment Ledger
            </h1>
            <p className="text-blue-100/60 mt-1">
              Verified manual payments, pending proofs, and revenue for advertiser bookings.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-5 py-3">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-300 font-bold text-sm">Verified Booking Payments</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Verified Revenue",
              value: fmt(totalRevenue),
              color: "text-emerald-400",
              border: "border-emerald-500/20",
              bg: "bg-emerald-500/5",
              icon: TrendingUp,
            },
            {
              label: "Pending Review",
              value: fmt(pendingRevenue),
              color: "text-amber-400",
              border: "border-amber-500/20",
              bg: "bg-amber-500/5",
              icon: DollarSign,
            },
            {
              label: "Total Txns",
              value: payments.length,
              color: "text-blue-400",
              border: "border-blue-500/20",
              bg: "bg-blue-500/5",
              icon: Hash,
            },
            {
              label: "Verified Txns",
              value: payments.filter((payment) => isVerifiedTransaction(payment)).length,
              color: "text-cyan-400",
              border: "border-cyan-500/20",
              bg: "bg-cyan-500/5",
              icon: CheckCircle,
            },
          ].map(({ label, value, color, border, bg, icon: Icon }) => (
            <div key={label} className={`${bg} border ${border} rounded-2xl p-5`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black text-blue-200/40 uppercase tracking-widest">{label}</p>
                <Icon size={16} className={color} />
              </div>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by advertiser or verification reference..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full bg-[#131A2A]/80 border border-blue-500/20 text-white rounded-2xl py-4 pl-14 pr-4 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            <Search size={20} className="absolute left-5 top-4 text-blue-500/50" />
          </div>
          <div className="flex bg-[#131A2A]/80 border border-blue-500/20 rounded-2xl overflow-hidden">
            {["all", "paid", "completed", "pending", "requires_action", "failed"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`flex-1 px-5 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${
                  filterStatus === status
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-blue-200/40 hover:text-white hover:bg-white/5"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64 text-cyan-400 animate-pulse font-bold text-xl">
            Loading Ledger...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 bg-[#131A2A]/40 border border-white/5 border-dashed rounded-3xl">
            <CreditCard size={48} className="text-white/10 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Transactions</h3>
            <p className="text-blue-200/50 text-center max-w-sm">
              No payment records match your filter. Verified advertiser payments will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="bg-[#131A2A]/80 border border-white/5 rounded-3xl overflow-hidden">
            <div className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-white/5 bg-[#0A0F1C]/40">
              {["Transaction ID", "Advertiser", "Billboard / Slot", "Amount", "Status"].map((heading) => (
                <p key={heading} className="text-[10px] font-black text-blue-200/30 uppercase tracking-widest">
                  {heading}
                </p>
              ))}
            </div>

            <div className="divide-y divide-white/5">
              {filtered.map((payment, index) => {
                const statusKey = payment.status || payment.paymentStatus || "pending";
                const statusConfig = STATUS[statusKey] || STATUS.pending;
                const bookingStage =
                  payment.booking?.status === "scheduled" ||
                  payment.booking?.status === "active" ||
                  payment.booking?.status === "completed"
                    ? `Schedule: ${payment.booking?.status} · `
                    : "";

                return (
                  <motion.div
                    key={payment._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="grid grid-cols-5 gap-4 px-6 py-4 hover:bg-white/5 transition-colors items-center"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <Hash size={12} className="text-cyan-300" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-mono text-blue-200/60 truncate">
                          {(payment.gatewayTransactionId || payment._id || "").slice(-12)}
                        </span>
                        <span className="block text-[10px] text-blue-200/35 truncate">
                          {payment.invoiceNumber || "No booking ref"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-medium text-white truncate">
                      <User size={13} className="text-primary flex-shrink-0" />
                      {payment.advertiser?.name || payment.userId?.name || "Unknown"}
                    </div>

                    <div className="min-w-0 text-xs text-blue-200/50">
                      <p className="truncate">{payment.booking?.billboard?.name || payment.description || "Booking Payment"}</p>
                      <p className="mt-1 truncate text-[10px] text-blue-200/35">
                        {bookingStage}
                        Booking ref: {payment.gatewayReference || "N/A"} · Payment ref: {payment.gatewayTransactionId || "N/A"}
                      </p>
                      <p className="mt-1 text-[10px] text-blue-200/30">
                        Method: {getMethodLabel(payment)}
                      </p>
                    </div>

                    <div className="text-base font-black text-cyan-400">
                      {fmt(payment.amount || payment.totalPrice)}
                    </div>

                    <div>
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${statusConfig.color} ${statusConfig.bg} ${statusConfig.border}`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="px-6 py-4 border-t border-white/5 bg-[#0A0F1C]/40 flex justify-between items-center">
              <p className="text-xs text-blue-200/40 font-medium">
                {filtered.length} transaction{filtered.length !== 1 ? "s" : ""} shown
              </p>
              <p className="text-sm font-black text-cyan-400">
                Total: {fmt(filtered.reduce((sum, payment) => sum + (payment.amount || payment.totalPrice || 0), 0))}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

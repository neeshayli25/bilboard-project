import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCard, RefreshCw, DollarSign, Clock } from "lucide-react";
import { getPayments } from "../../api";

export default function Payments() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await getPayments();
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(amount);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading payment history...</p>
        </div>
      </div>
    );
  }

  const totalSpent = transactions.reduce((sum, t) => sum + (t.status === "completed" ? t.amount : 0), 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payment History</h1>
          <p className="text-gray-500 mt-1">Track verification steps, successful payments, and refunds</p>
        </div>
        <button onClick={fetchPayments} className="p-2 text-gray-500 hover:text-indigo-600 transition">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-indigo-50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <DollarSign size={16} /> Total Spent
          </div>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CreditCard size={16} /> Completed
          </div>
          <p className="text-2xl font-bold text-gray-800">{transactions.filter(t => t.status === "completed").length}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-yellow-600 mb-2">
            <Clock size={16} /> Pending
          </div>
          <p className="text-2xl font-bold text-gray-800">{transactions.filter(t => ["pending", "requires_action"].includes(t.status)).length}</p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <CreditCard size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No transactions found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-xl shadow-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billboard</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map(t => (
                <tr key={t._id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-800">{t.invoiceNumber || t._id.slice(-6)}</td>
                  <td className="px-6 py-4 text-gray-600">{t.booking?.billboard?.name || "Billboard booking"}</td>
                  <td className="px-6 py-4 font-semibold text-gray-800">{formatCurrency(t.amount)}</td>
                  <td className="px-6 py-4 capitalize text-gray-600">{t.method || t.gateway || "N/A"}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      t.status === "completed" ? "bg-green-100 text-green-700" :
                      t.status === "pending" || t.status === "requires_action" ? "bg-yellow-100 text-yellow-700" :
                      t.status === "refunded" ? "bg-blue-100 text-blue-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {t.status === "requires_action" ? "awaiting_code" : t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

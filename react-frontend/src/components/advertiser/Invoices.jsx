import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Eye, RefreshCw } from "lucide-react";
import { getInvoices } from "../../api";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await getInvoices();
      setInvoices(res.data);
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
          <p className="text-gray-500">Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Invoices</h1>
          <p className="text-gray-500 mt-1">View and download your payment invoices</p>
        </div>
        <button onClick={fetchInvoices} className="p-2 text-gray-500 hover:text-indigo-600 transition">
          <RefreshCw size={18} />
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <FileText size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No invoices found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-xl shadow-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map(inv => (
                <tr key={inv._id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-800">{inv.invoiceNumber}</td>
                  <td className="px-6 py-4 font-semibold text-gray-800">{formatCurrency(inv.amount)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      inv.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{new Date(inv.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <button className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-sm">
                      <Eye size={16} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary card */}
      <div className="mt-6 bg-indigo-50 rounded-xl p-4 flex justify-between items-center">
        <span className="text-indigo-800 font-medium">Total Paid:</span>
        <span className="text-xl font-bold text-indigo-800">
          {formatCurrency(invoices.filter(i => i.status === "paid").reduce((sum, i) => sum + i.amount, 0))}
        </span>
      </div>
    </div>
  );
}
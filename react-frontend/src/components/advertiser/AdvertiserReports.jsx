import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, TrendingUp, Calendar, DollarSign, Eye } from "lucide-react";
import { CSVLink } from "react-csv";
import { getReports } from "../../api";

export default function AdvertiserReports() {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState("bookings");

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await getReports();
      setReportData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(amount);

  const csvData = reportData.map(item => ({
    "Booking ID": item.id,
    "Billboard": item.billboard,
    "Date": item.date,
    "Time Slot": item.timeSlot,
    "Amount": item.amount,
    "Status": item.status
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
        <p className="text-gray-500 mt-1">View your campaign performance and booking history</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 mb-6">
          {["bookings", "payments", "performance"].map(type => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`px-4 py-2 text-sm font-medium transition-all ${reportType === type ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-indigo-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <Calendar size={16} /> Total Bookings
            </div>
            <p className="text-2xl font-bold text-gray-800">{reportData.length}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <DollarSign size={16} /> Total Spend
            </div>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(reportData.reduce((sum, r) => sum + (r.amount || 0), 0))}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <Eye size={16} /> Active Campaigns
            </div>
            <p className="text-2xl font-bold text-gray-800">{reportData.filter(r => r.status === "approved").length}</p>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading reports...</div>
        ) : reportData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No data available.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billboard</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time Slot</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800">{item.id || "#" + idx}</td>
                      <td className="px-4 py-3 text-gray-800">{item.billboard}</td>
                      <td className="px-4 py-3 text-gray-600">{item.date}</td>
                      <td className="px-4 py-3 text-gray-600">{item.timeSlot}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{formatCurrency(item.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === "approved" ? "bg-green-100 text-green-700" :
                          item.status === "rejected" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {item.status || "pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <CSVLink
                data={csvData}
                filename={`advertiser_report_${new Date().toISOString().slice(0,10)}.csv`}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition"
              >
                <Download size={16} /> Export CSV
              </CSVLink>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
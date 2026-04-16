import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Calendar,
  BookOpen,
  Monitor,
  Download,
  Filter,
} from "lucide-react";
import { CSVLink } from "react-csv";
import { getRevenueReport, getCampaignReport, getBookingReport, getBillboardPerformance } from "../../services/adminApi";

const AdminReports = () => {
  const [selectedReport, setSelectedReport] = useState("revenue");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [selectedReport, dateRange]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let res;
      const params = dateRange.start && dateRange.end ? `?startDate=${dateRange.start}&endDate=${dateRange.end}` : "";
      switch (selectedReport) {
        case "revenue":
          res = await getRevenueReport(params);
          setData(res.data);
          break;
        case "campaigns":
          res = await getCampaignReport();
          setData(res.data);
          break;
        case "bookings":
          res = await getBookingReport();
          setData(res.data);
          break;
        case "billboard":
          res = await getBillboardPerformance();
          setData(res.data);
          break;
        default:
          setData([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0 }).format(val);

  const renderTable = () => {
    if (loading) return <div className="text-center py-8">Loading...</div>;
    if (data.length === 0) return <div className="text-center py-8">No data available</div>;

    switch (selectedReport) {
      case "revenue":
        return (
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-indigo-800 text-indigo-200">
              <tr><th className="px-4 py-3">Month</th><th className="px-4 py-3">Revenue</th><th className="px-4 py-3">Bookings</th></tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-indigo-700 hover:bg-indigo-700/30">
                  <td className="px-4 py-3 font-medium">{row.month}</td>
                  <td className="px-4 py-3">{formatCurrency(row.amount)}</td>
                  <td className="px-4 py-3">{row.bookings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "campaigns":
        return (
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-indigo-800 text-indigo-200">
              <tr><th className="px-4 py-3">Campaign</th><th className="px-4 py-3">Advertiser</th><th className="px-4 py-3">Impressions</th><th className="px-4 py-3">Spend</th></tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-indigo-700 hover:bg-indigo-700/30">
                  <td className="px-4 py-3 font-medium">{row._id}</td>
                  <td className="px-4 py-3">{row.advertiser}</td>
                  <td className="px-4 py-3">{row.impressions.toLocaleString()}</td>
                  <td className="px-4 py-3">{formatCurrency(row.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "bookings":
        return (
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-indigo-800 text-indigo-200">
              <tr><th className="px-4 py-3">Booking ID</th><th className="px-4 py-3">Advertiser</th><th className="px-4 py-3">Billboards</th><th className="px-4 py-3">Start Date</th><th className="px-4 py-3">End Date</th><th className="px-4 py-3">Value</th></tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b border-indigo-700 hover:bg-indigo-700/30">
                  <td className="px-4 py-3 font-medium">{row.id.slice(-6)}</td>
                  <td className="px-4 py-3">{row.advertiser}</td>
                  <td className="px-4 py-3">{row.billboards}</td>
                  <td className="px-4 py-3">{new Date(row.startDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{new Date(row.endDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{formatCurrency(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "billboard":
        return (
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-indigo-800 text-indigo-200">
              <tr><th className="px-4 py-3">Billboard</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Plays</th><th className="px-4 py-3">Revenue</th></tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-indigo-700 hover:bg-indigo-700/30">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">{row.location}</td>
                  <td className="px-4 py-3">{row.plays.toLocaleString()}</td>
                  <td className="px-4 py-3">{formatCurrency(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      default:
        return null;
    }
  };

  const getChartData = () => {
    if (selectedReport === "revenue" && data.length) return data.map(d => ({ value: d.amount / 1000, label: d.month }));
    if (selectedReport === "campaigns") return data.slice(0,6).map((d,i) => ({ value: (d.impressions / 10000), label: d._id?.slice(0,3) }));
    return [40, 65, 55, 80, 70, 90]; // fallback
  };

  const chartValues = getChartData();

  const reportTypes = [
    { id: "revenue", label: "Revenue", icon: TrendingUp, color: "bg-indigo-500" },
    { id: "campaigns", label: "Campaigns", icon: BookOpen, color: "bg-purple-500" },
    { id: "bookings", label: "Bookings", icon: Calendar, color: "bg-blue-500" },
    { id: "billboard", label: "Billboard Performance", icon: Monitor, color: "bg-indigo-400" },
  ];

  const totalRevenue = data.reduce((sum, r) => sum + (r.amount || r.value || r.spend || 0), 0);
  const totalBookings = data.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white p-6">
      <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
        <h1 className="text-5xl font-extrabold text-indigo-100 drop-shadow-lg">Reports</h1>
        <p className="text-indigo-200 mt-2 text-lg">Deep insights into your business</p>
      </motion.div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
        <div className="flex gap-2">
          <button onClick={() => setShowDatePicker(!showDatePicker)} className="bg-indigo-700 px-4 py-2 rounded-xl flex items-center gap-2">
            <Calendar size={18} /> Filter by Date
          </button>
          {showDatePicker && (
            <div className="flex gap-2">
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="bg-indigo-800 rounded-lg px-3 py-2" />
              <span>to</span>
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="bg-indigo-800 rounded-lg px-3 py-2" />
            </div>
          )}
        </div>
        <CSVLink data={data} filename={`${selectedReport}_report.csv`} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl flex items-center gap-2">
          <Download size={18} /> Export CSV
        </CSVLink>
      </div>

      {/* Report Tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 flex flex-wrap gap-3">
        {reportTypes.map((type) => {
          const Icon = type.icon;
          return (
            <motion.button
              key={type.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedReport(type.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
                selectedReport === type.id ? `${type.color} text-white shadow-lg` : "bg-indigo-800/50 text-indigo-200 hover:bg-indigo-700"
              }`}
            >
              <Icon className="w-5 h-5" /> {type.label}
            </motion.button>
          );
        })}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-1">
          <div className="bg-indigo-800/40 backdrop-blur-sm rounded-2xl p-5 border border-indigo-600 h-full">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><span className="w-2 h-6 bg-indigo-400 rounded-full"></span>Visualization</h2>
            <div className="h-64 flex flex-col justify-end">
              <div className="flex items-end gap-2 h-48">
                {chartValues.map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <motion.div initial={{ height: 0 }} animate={{ height: `${Math.min(100, Math.max(10, Number(h.value) || 40))}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }} className="w-full bg-indigo-300 rounded-t-lg" style={{ height: `${Math.min(100, Math.max(10, Number(h.value) || 40))}%` }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-indigo-300">
                {chartValues.map((h, i) => <span key={i}>{h.label || `Item ${i+1}`}</span>)}
              </div>
            </div>
            <p className="text-center text-indigo-300 text-sm mt-4">
              {selectedReport === "revenue" && "Monthly revenue trend"}
              {selectedReport === "campaigns" && "Top campaigns by impressions"}
              {selectedReport === "bookings" && "Bookings per period"}
              {selectedReport === "billboard" && "Billboard play distribution"}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="lg:col-span-2">
          <div className="bg-indigo-800/40 backdrop-blur-sm rounded-2xl p-5 border border-indigo-600">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2"><span className="w-2 h-6 bg-indigo-400 rounded-full"></span>Data Table</h2>
            </div>
            <div className="overflow-x-auto">
              <AnimatePresence mode="wait">
                <motion.div key={selectedReport} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                  {renderTable()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-indigo-800/30 backdrop-blur-sm rounded-xl p-4 border border-indigo-600">
          <p className="text-indigo-300 text-sm">Total Revenue</p>
          <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-indigo-800/30 backdrop-blur-sm rounded-xl p-4 border border-indigo-600">
          <p className="text-indigo-300 text-sm">Total Records</p>
          <p className="text-2xl font-bold">{totalBookings}</p>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminReports;
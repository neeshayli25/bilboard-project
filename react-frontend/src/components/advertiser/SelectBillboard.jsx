import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Monitor, DollarSign, Calendar, Clock } from "lucide-react";
import { getCities, getBillboardsByCity } from "../../api";

export default function SelectBillboard() {
  const navigate = useNavigate();
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [billboards, setBillboards] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCities().then(res => setCities(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedCity) {
      setLoading(true);
      getBillboardsByCity(selectedCity)
        .then(res => setBillboards(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setBillboards([]);
    }
  }, [selectedCity]);

  const handleSelectBillboard = (billboard) => {
    navigate("/advertiser/create-booking", { state: { selectedBillboard: billboard } });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Select a Billboard</h1>
        <p className="text-gray-500 mt-1">Choose a city to see available billboards</p>
      </div>

      {/* City selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
        <select
          className="w-full md:w-64 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
        >
          <option value="">-- Select City --</option>
          {cities.map(city => <option key={city} value={city}>{city}</option>)}
        </select>
      </div>

      {/* Billboards grid */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      )}

      {!loading && selectedCity && billboards.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Monitor size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No billboards available in {selectedCity}.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {billboards.map(b => (
          <div
            key={b._id}
            onClick={() => handleSelectBillboard(b)}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition group"
          >
            <div className="h-40 overflow-hidden">
              <img
                src={b.imageUrl || "https://picsum.photos/seed/billboard/400/250"}
                alt={b.name}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
            </div>
            <div className="p-4">
              <h3 className="text-lg font-bold text-gray-800">{b.name}</h3>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-indigo-500" /> {b.location}, {b.city}
                </div>
                <div className="flex items-center gap-2">
                  <Monitor size={14} className="text-indigo-500" /> {b.type} • {b.resolution}
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-indigo-500" /> PKR {b.pricePerHour}/hour
                </div>
                {b.timeSlots && b.timeSlots.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Clock size={14} className="text-indigo-500 mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                      {b.timeSlots.slice(0, 2).map(slot => (
                        <span key={slot} className="text-xs bg-gray-100 px-2 py-1 rounded">{slot}</span>
                      ))}
                      {b.timeSlots.length > 2 && <span className="text-xs text-gray-400">+{b.timeSlots.length - 2}</span>}
                    </div>
                  </div>
                )}
              </div>
              <button className="mt-4 w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg text-sm font-medium transition">
                Select Billboard →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
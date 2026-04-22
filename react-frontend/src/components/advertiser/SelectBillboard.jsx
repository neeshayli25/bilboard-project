import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Monitor, MapPin, Search, ArrowLeft, Building2, Map, Tag } from "lucide-react";
import { getAllBillboards } from "../../services/adminApi";
import { motion, AnimatePresence } from "framer-motion";
import { buildMediaUrl } from "../../utils/media";

export default function SelectBillboard() {
  const [billboards, setBillboards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Drill-down states
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getAllBillboards();
      setBillboards(r.data.filter(b => b.status === "active"));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Derive unique cities
  const cities = useMemo(() => {
    return [...new Set(billboards.map(b => b.city))].filter(Boolean).sort();
  }, [billboards]);

  // Derive locations in selected city
  const locationsInCity = useMemo(() => {
    if (!selectedCity) return [];
    return [...new Set(billboards.filter(b => b.city === selectedCity).map(b => b.location))].filter(Boolean).sort();
  }, [billboards, selectedCity]);

  // Derive billboards in selected location
  const finalBillboards = useMemo(() => {
    if (!selectedLocation) return [];
    let filtered = billboards.filter(b => b.location === selectedLocation && b.city === selectedCity);
    if (searchTerm) {
       filtered = filtered.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return filtered;
  }, [billboards, selectedCity, selectedLocation, searchTerm]);

  const attemptBooking = (billboard) => {
    navigate("/advertiser/create-booking", { state: { billboard } });
  };

  return (
    <div className="flex flex-col gap-8 h-full bg-[#0A0F1C] text-white pb-16">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute w-[800px] h-[800px] bg-sky-600/10 blur-[150px] mix-blend-screen top-[-10%] right-[-10%] rounded-full"></div>
        <div className="absolute w-[600px] h-[600px] bg-indigo-600/5 blur-[120px] mix-blend-screen bottom-[-10%] left-[-10%] rounded-full"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 pt-8">
        {/* Header & Flow Controls */}
        <div className="flex flex-col gap-4 mb-10">
          <div className="flex items-center gap-4">
            <AnimatePresence>
              {(selectedCity || selectedLocation) && (
                <motion.button 
                  initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}
                  onClick={() => {
                    if (selectedLocation) setSelectedLocation(null);
                    else if (selectedCity) setSelectedCity(null);
                  }}
                  className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center transition-all"
                >
                  <ArrowLeft size={20} className="text-white/70" />
                </motion.button>
              )}
            </AnimatePresence>
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">Marketplace</h1>
              <p className="text-blue-200/50 mt-1">
                {!selectedCity ? "Step 1: Choose a Target City" : !selectedLocation ? `Step 2: Choose a Location in ${selectedCity}` : `Step 3: Asset Selection for ${selectedLocation}`}
              </p>
            </div>
          </div>
          
          {selectedLocation && (
            <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} className="relative w-full max-w-xl mt-4">
              <input type="text" placeholder="Search billboard by name..." 
                 className="w-full bg-[#131A2A]/80 border border-sky-500/30 text-white rounded-2xl py-4 pl-14 pr-4 shadow-[0_0_20px_rgba(14,165,233,0.1)] focus:outline-none focus:border-sky-500 transition-colors backdrop-blur-md" 
                 value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <Search size={22} className="absolute left-5 top-4 text-sky-500/50"/>
            </motion.div>
          )}
        </div>

        {/* --- Content Area --- */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
             <div className="text-center">
                <div className="w-12 h-12 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sky-400 font-bold uppercase tracking-widest text-xs">Pinging Nodes...</p>
             </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* STEP 1: CITIES */}
            {!selectedCity && (
              <motion.div key="cities" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, x:-20 }}>
                {cities.length === 0 ? (
                  <div className="text-center py-20 bg-white/5 border border-white/5 rounded-3xl">
                     <Building2 size={48} className="mx-auto text-white/20 mb-4" />
                     <p className="text-white/40">No available cities.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {cities.map(city => (
                      <div key={city} onClick={() => setSelectedCity(city)}
                        className="bg-[#131A2A]/80 border border-white/5 hover:border-sky-500/40 rounded-3xl p-8 cursor-pointer transition-all hover:bg-[#131A2A] shadow-lg group relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-20 transition-opacity">
                          <Building2 size={120} className="text-sky-400" />
                        </div>
                        <Building2 size={32} className="text-sky-400 mb-6" />
                        <h2 className="text-2xl font-black text-white relative z-10">{city}</h2>
                        <p className="text-xs text-blue-200/40 uppercase tracking-widest mt-2 relative z-10">
                          {billboards.filter(b => b.city === city).length} Active Assets
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 2: LOCATIONS */}
            {selectedCity && !selectedLocation && (
              <motion.div key="locations" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {locationsInCity.map(loc => (
                    <div key={loc} onClick={() => setSelectedLocation(loc)}
                      className="bg-[#131A2A]/80 border border-white/5 hover:border-emerald-500/40 rounded-3xl p-8 cursor-pointer transition-all hover:bg-[#131A2A] shadow-lg group relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-20 transition-opacity">
                        <Map size={120} className="text-emerald-400" />
                      </div>
                      <MapPin size={32} className="text-emerald-400 mb-6" />
                      <h2 className="text-xl font-black text-white relative z-10 leading-tight">{loc}</h2>
                      <p className="text-xs text-blue-200/40 uppercase tracking-widest mt-3 relative z-10">
                        {billboards.filter(b => b.city === selectedCity && b.location === loc).length} Displays
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 3: BILLBOARDS */}
            {selectedCity && selectedLocation && (
              <motion.div key="billboards" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}>
                {finalBillboards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-20 bg-[#131A2A]/40 border border-white/5 rounded-3xl">
                     <Monitor size={48} className="text-blue-500/30 mb-4" />
                     <p className="text-blue-200/50">No billboards matches your search criterion.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
                    {finalBillboards.map(b => (
                      <div key={b._id} className="bg-[#131A2A]/80 backdrop-blur-md border border-white/5 hover:border-sky-500/30 rounded-3xl overflow-hidden transition-all duration-300 shadow-xl group flex flex-col relative">
                        
                        <div className="relative h-64 overflow-hidden bg-[#0A0F1C]">
                          {b.imageUrl ? (
                            <img src={buildMediaUrl(b.imageUrl)} alt={b.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" />
                          ) : (
                            <div className="flex items-center justify-center h-full"><Monitor size={64} className="text-white/5" /></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1C] via-[#0A0F1C]/40 to-transparent" />
                          
                          <div className="absolute top-4 left-4">
                             <span className="bg-sky-500/20 backdrop-blur-md border border-sky-500/40 text-sky-100 text-[10px] uppercase tracking-widest font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg">
                               <Tag size={12}/> PKR {b.pricePerHour} / min
                             </span>
                          </div>

                          <div className="absolute bottom-6 left-6 right-6">
                            <h3 className="text-2xl font-black text-white drop-shadow-lg truncate mb-1">{b.name}</h3>
                            <p className="text-blue-100/70 text-sm flex items-center gap-1.5 font-medium truncate">
                              <MapPin size={14} className="text-sky-400"/> {b.city}, {b.location}
                            </p>
                          </div>
                        </div>

                        <div className="p-6 flex flex-col flex-grow">
                           <div className="grid grid-cols-3 gap-3 text-center mb-6">
                             <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex flex-col">
                               <span className="text-[9px] text-white/30 uppercase tracking-widest font-black mb-1">Dimensions</span>
                               <span className="text-xs text-white/80 font-bold">{b.size}</span>
                             </div>
                             <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex flex-col">
                               <span className="text-[9px] text-white/30 uppercase tracking-widest font-black mb-1">Type</span>
                               <span className="text-xs text-white/80 font-bold">{b.type}</span>
                             </div>
                             <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex flex-col">
                               <span className="text-[9px] text-white/30 uppercase tracking-widest font-black mb-1">Resolution</span>
                               <span className="text-xs text-white/80 font-bold">{b.resolution}</span>
                             </div>
                           </div>
                           
                           <button onClick={() => attemptBooking(b)} 
                             className="mt-auto w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all text-white bg-sky-600 hover:bg-sky-500 hover:shadow-[0_0_30px_rgba(14,165,233,0.3)]">
                             Proceed to Schedule
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  const [token, setToken] = useState(sessionStorage.getItem("token"));
  const [role, setRole] = useState(sessionStorage.getItem("role"));
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    // We update token and role in case of navigation changes
    setToken(sessionStorage.getItem("token"));
    setRole(sessionStorage.getItem("role"));
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("userName");
    setToken(null);
    setRole(null);
    navigate("/");
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0A0F1C]/90 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.5)] py-4 border-b border-white/5' : 'bg-transparent py-6'}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6">
        {/* Left Section */}
        <div className="flex items-center gap-10">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 font-extrabold text-2xl text-white select-none hover:text-blue-400 transition-colors">
            <span className="text-3xl drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]">📊</span>
            <span className="tracking-wider">CDBMS</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex gap-8 text-gray-300 font-semibold text-sm uppercase tracking-wider">
            <Link to="/" className="hover:text-blue-400 transition-colors">Home</Link>
            <Link to="/ads" className="hover:text-blue-400 transition-colors">Ads</Link>
            <Link to="/analytics" className="hover:text-blue-400 transition-colors">Analytics</Link>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-6">
          {!token ? (
            <>
              <Link to="/Login" className="text-gray-300 hover:text-white font-bold text-sm tracking-wider uppercase transition-colors">
                Login
              </Link>
              
              <Link to="/Signup">
                <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-7 py-2.5 rounded-full font-bold text-sm tracking-wide hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all duration-300 transform hover:-translate-y-0.5 border border-white/10">
                  Sign Up Free
                </button>
              </Link>
            </>
          ) : (
            <>
              <Link to={role === "admin" ? "/admin" : "/advertiser"}>
                <button className="text-white bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all duration-300 transform hover:-translate-y-0.5">
                  Dashboard
                </button>
              </Link>
              
              <button onClick={handleLogout} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-5 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all duration-300 transform hover:-translate-y-0.5 shadow-[0_0_10px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
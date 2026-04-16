import { Link } from "react-router-dom"

function NavBar() {
  return (
    <nav className="fixed top-9 max-w-7xl mx-auto left-0 right-0 bg-white/90 backdrop-blur-md shadow-2xl z-50 rounded-full">
  <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">

    {/* Left Section */}
    <div className="flex items-center gap-10">
      {/* Logo */}
      <div className="flex items-center gap-3 font-extrabold text-2xl text-[#7B3F00] select-none">
        <span className="text-3xl">📊</span>
        <span>CDBMS</span>
      </div>

      {/* Navigation Links */}
      <div className="hidden md:flex gap-8 text-[#7B3F00] font-semibold text-lg">
        <Link to="/" className="hover:text-[#D97706] transition-colors">Home</Link>
        <Link to="/ads" className="hover:text-[#D97706] transition-colors">Ads</Link>
        <Link to="/analytics" className="hover:text-[#D97706] transition-colors">Analytics</Link>
        <Link to="/Login" className="hover:text-[#D97706] transition-colors">Login</Link>
      </div>
    </div>

    {/* Right Section */}
    <div className="flex items-center gap-6">
        <Link to="/Login" className="hover:text-[#D97706] transition-colors">
      <button className="text-[#7B3F00] font-bold text-lg hover:text-[#D97706] transition-all">
        Login
      </button>
        </Link>
        
        <Link to="/Signup" className="hover:text-[#D97706] transition-colors">
      <button  className="bg-gradient-to-r from-[#FF8C00] via-[#FFA500] to-[#FFD700] text-white px-6 py-3 rounded-full font-bold text-lg hover:scale-105 hover:shadow-lg transition-transform">
        Sign Up for Free
      </button>
      </Link>
    </div>

  </div>
</nav>
  )
}

export default NavBar
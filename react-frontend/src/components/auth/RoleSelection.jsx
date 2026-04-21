import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import NavBar from "../ui/NavBar";
import { Link } from "react-router-dom"
import img from "./images/img.png";
import ad from "./images/ad.jpeg";
import burger from "./images/burger.jpg";
import shoes from "./images/shoes.avif";
import coke from "./images/coke.jpeg";
import seven from "./images/seven.jpeg";
import cloths from "./images/cloths.webp";
import lays from "./images/lays.jpeg";
import makeup from "./images/makeup.jpeg";
import colors from "./images/colors.webp";
import cookie from "./images/cookie.webp";
import baby from "./images/baby.jpeg";
import baby1 from "./images/baby1.webp";
import babyc from "./images/babyc.jpeg";
import babyc1 from "./images/babyc1.jpeg";
import biscuits from "./images/biscuits.jpeg";
import game1 from "./images/game1.avif";
import cake from "./images/cake.jpeg";
import pasta from "./images/pasta.jpg";
import sandals from "./images/sandals.jpg";
import watch from "./images/watch.jpeg";
import whiteshoes from "./images/whiteshoes.jpeg";
import donut from "./images/donut.jpeg";
import baby3 from "./images/baby3.jpeg";
import games2 from "./images/games2.jpeg";
import buttler from "./images/buttler.png";
import bethell from "./images/bethell.avif";
import stokes from "./images/stokes.png";
import game2 from "./images/game2.webp";
import game4 from "./images/game4.jpeg";
import ear from "./images/ear.jpeg";
import ear2 from "./images/ear2.jpeg";
import arm from "./images/arm.webp";
import arm2 from "./images/arm2.jpeg";
import arm3 from "./images/arm3.jpg";
import food1 from "./images/food1.jpeg";
import food2 from "./images/food2.jpg";
import food3 from "./images/food3.webp";
import food4 from "./images/food4.jpeg";
import food5 from "./images/food5.webp";
import food6 from "./images/food6.png";
import buildings from "./images/buildings.png";
import ads1 from "./images/ads1.webp";
import ads2 from "./images/ads2.jpeg";
import ads3 from "./images/ads3.jpeg";
import img1 from "./images/img1.avif";

import {
  FaUserShield,
  FaBullhorn,
  FaChevronDown,
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
} from "react-icons/fa";

const ads = [
  img, ad, burger, shoes, coke, bethell, seven, cloths, games2, game1, game2,
  lays, makeup, colors, cookie, stokes, baby, baby1, babyc, babyc1, biscuits,
  cake, pasta, sandals, watch, buttler, whiteshoes, donut, baby3, buttler,
  bethell, stokes, game4, ear, ear2, arm, arm2, arm3, bethell, food1, food2,
  food3, food4, food5, food6, stokes
];

const wheelImages = [
  ad, cookie, burger, shoes, coke, lays, baby, makeup, pasta, watch, donut, food1
];

// FIX: headingText defined
const headingText = "Centralized Digital Billboard Ads";

export default function RoleSelection() {
  const [openIndex, setOpenIndex] = useState(null);

  const Slider = ({ reverse = false, speed = 10 }) => (
    <div className="w-full overflow-hidden px-4 my-6">
      <motion.div
        className="flex space-x-6"
        animate={{ x: reverse ? ["0%", "-100%"] : ["-100%", "0%"] }}
        transition={{ repeat: Infinity, repeatType: "loop", duration: speed, ease: "linear" }}
      >
        {ads.map((adItem, index) => (
          <motion.img
            key={index}
            src={adItem}
            alt={`ad-${index}`}
            className="w-64 h-40 object-cover rounded-lg shadow-lg flex-shrink-0 cursor-pointer"
            whileHover={{ scale: 1.1, boxShadow: "0px 0px 20px rgba(255,255,255,0.7)" }}
          />
        ))}
      </motion.div>
    </div>
  );

  // FAQ Data
  const faqData = [
    {
      question: "What is CDBMS?",
      answer: "CDBMS (Centralized Database Management System) is a system where all data is stored and managed from a central location allowing multiple users to access and manage data efficiently."
    },
    {
      question: "Why is CDBMS important?",
      answer: "It ensures data consistency, reduces redundancy, improves security, and allows centralized control over data management."
    },
    {
      question: "How does CDBMS improve data security?",
      answer: "CDBMS uses authentication, authorization, and encryption mechanisms to protect sensitive data from unauthorized access."
    },
    {
      question: "What are the advantages of CDBMS?",
      answer: "Advantages include centralized data control, improved backup systems, easier maintenance, and better collaboration between users."
    },
    {
      question: "Where is CDBMS used?",
      answer: "CDBMS is used in banks, universities, healthcare systems, government institutions, and enterprise applications."
    },
    {
      question: "Does CDBMS provide analytics for advertisements?",
      answer: "Yes. Most CDBMS platforms provide analytics and reporting tools that show how advertisements perform across different locations, helping advertisers make better decisions and optimize their campaigns."
    },
    {
      question: "How does CDBMS help advertisers manage campaigns?",
      answer: "CDBMS allows advertisers to upload advertisements, schedule campaigns, and control where and when ads appear on digital billboards. It simplifies campaign management by providing centralized tools to monitor performance and update content in real time."
    },
    {
      question: "Can multiple billboards be controlled from one system?",
      answer: "A centralized digital billboard management system allows administrators to control and manage advertisements across multiple billboards from a single dashboard, making large-scale advertising campaigns easier to handle."
    },
    {
      question: "What is the difference between DBMS and CDBMS?",
      answer: "DBMS manages databases in general, while CDBMS specifically stores and manages data in a centralized server system."
    }
  ];

  return (
    <div className="relative">
      <NavBar />
      <div>
        {/* SECTION 1: Role Selection */}
        <section className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden bg-[#0A0F1C]">
          {/* Animated Background Glow Nodes */}
          <motion.div
            animate={{ x: [0, 50, 0], y: [0, -50, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full mix-blend-screen filter blur-[120px]"
          />
          <motion.div
            animate={{ x: [0, -50, 0], y: [0, 50, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-600/20 rounded-full mix-blend-screen filter blur-[120px]"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[30%] left-[40%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full mix-blend-screen filter blur-[150px] pointer-events-none"
          />

          <div className="relative z-10 flex flex-col justify-center items-center text-center px-6 max-w-6xl w-full pt-10">

            {/* Subtitle Badge */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="mb-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-md">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                <span className="text-blue-400 text-sm font-semibold tracking-widest uppercase">Next-Gen Advertising Platform</span>
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            >
              <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.1]">
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-blue-100 to-indigo-300 drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]">Centralized Digital Billboard</span> <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 animate-gradient-xy drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                  Management System
                </span>
              </h1>
              <p className="text-lg md:text-xl text-blue-100/70 max-w-3xl mx-auto mb-16 leading-relaxed font-medium">
                Revolutionize how you manage, schedule, and showcase advertisements. Whether you are orchestrating a nationwide digital billboard network or amplifying your brand's reach, CDBMS provides real-time control with unparalleled precision.
              </p>
            </motion.div>

            {/* Role Selection Cards */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="flex flex-col md:flex-row gap-8 w-full justify-center"
            >
              {/* Admin Role Card */}
              <Link to="/login" className="group relative w-full md:w-[360px] rounded-[2rem] p-[1px] overflow-hidden focus:outline-none">
                {/* Hover Glowing Border */}
                <span className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-sm" />

                <div className="relative h-full bg-[#131A2A]/90 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-10 flex flex-col items-center text-center transition-all duration-500 group-hover:bg-[#1A233A] group-hover:-translate-y-3 group-hover:shadow-[0_20px_60px_-15px_rgba(59,130,246,0.5)]">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-6 border border-white/5 group-hover:scale-110 transition-transform duration-500 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]">
                    <FaUserShield className="text-5xl text-blue-400 group-hover:text-blue-300 transition-colors" />
                  </div>
                  <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-100 to-blue-300 mb-4 drop-shadow-md">Administrator</h3>
                  <p className="text-indigo-200/60 text-sm leading-relaxed mb-8 flex-grow">
                    Govern the entire billboard network. Meticulously manage users, orchestrate advertisement approvals, and analyze real-time revenue streams.
                  </p>
                  <div className="mt-auto w-full py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-300 text-sm font-bold group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-purple-600 group-hover:text-white group-hover:border-transparent transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                    Access Workspace <motion.span className="ml-2" animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
                  </div>
                </div>
              </Link>

              {/* Advertiser Role Card */}
              <Link to="/login" className="group relative w-full md:w-[360px] rounded-[2rem] p-[1px] overflow-hidden focus:outline-none">
                {/* Hover Glowing Border */}
                <span className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-sm" />

                <div className="relative h-full bg-[#131A2A]/90 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-10 flex flex-col items-center text-center transition-all duration-500 group-hover:bg-[#1A233A] group-hover:-translate-y-3 group-hover:shadow-[0_20px_60px_-15px_rgba(16,185,129,0.5)]">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-6 border border-white/5 group-hover:scale-110 transition-transform duration-500 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]">
                    <FaBullhorn className="text-5xl text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                  </div>
                  <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 to-teal-300 mb-4 drop-shadow-md">Advertiser</h3>
                  <p className="text-teal-100/60 text-sm leading-relaxed mb-8 flex-grow">
                    Launch exceptional campaigns seamlessly. Book premium screen slots, upload ad creatives, and track your audience engagement live.
                  </p>
                  <div className="mt-auto w-full py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-300 text-sm font-bold group-hover:bg-gradient-to-r group-hover:from-emerald-500 group-hover:to-teal-500 group-hover:text-white group-hover:border-transparent transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                    Deploy Campaign <motion.span className="ml-2" animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>

          {/* Bottom Gradient Fade blending into next section */}
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none" />
        </section>

        {/* SECTION 2: Sliders */}
        <section className="min-h-screen flex flex-col justify-center items-center bg-black">
          <Slider reverse={false} speed={22} />
          <Slider reverse={true} speed={27} />
          <Slider reverse={false} speed={20} />
        </section>
        {/* Other sections */}
        <section className="min-h-screen flex items-center justify-center bg-[#0A0F1C] px-12 relative overflow-hidden border-t border-white/5">
          {/* Ambient glowing background blur */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-7xl w-full flex flex-col md:flex-row items-center gap-16 relative z-10">

            {/* LEFT SIDE — ROTATING WHEEL */}
            <div className="flex-1 flex justify-center md:justify-start w-full">

              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Infinity,
                  duration: 35,
                  ease: "linear"
                }}
                className="relative w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] lg:w-[500px] lg:h-[500px]"
              >
                {wheelImages.map((img, index) => {
                  const angle = (360 / wheelImages.length) * index;
                  // Responsive translate values based on screen size approximations via rem/px
                  return (
                    <motion.div
                      key={index}
                      className="absolute top-1/2 left-1/2 origin-center"
                      style={{
                        transform: `rotate(${angle}deg) translateY(-220px) rotate(-${angle}deg)`
                      }}
                    >
                      <motion.img
                        src={img}
                        className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 object-cover rounded-full border-2 border-white/20 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                        animate={{ rotate: -360 }}
                        transition={{
                          repeat: Infinity,
                          duration: 35,
                          ease: "linear"
                        }}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>

            </div>


            {/* RIGHT SIDE — TEXT */}
            <motion.div
              initial={{ opacity: 0, x: 80 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              viewport={{ once: true }}
              className="flex-1 flex flex-col justify-center text-center md:text-left pr-0 lg:pr-10"
            >

              {/* Dynamic Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                viewport={{ once: true }}
                className="mb-6 inline-block md:mx-0 mx-auto"
              >
                <span className="px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-bold tracking-widest uppercase">
                  Global Reach
                </span>
              </motion.div>

              {/* Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 leading-[1.1] mb-6 drop-shadow-lg">
                Upload And Showcase Your Ads Everywhere.
              </h1>

              {/* Paragraph */}
              <p className="text-lg lg:text-xl font-medium text-gray-400 leading-relaxed mb-10 max-w-lg mx-auto md:mx-0">
                Our centralized digital billboard management system allows advertisers
                to seamlessly upload and manage advertisements across multiple
                locations with powerful analytics and scheduling tools to maximize
                audience reach and campaign performance.
              </p>

              {/* Button */}
              <Link to="/Login" className="inline-block hover:text-white transition-colors group mx-auto md:mx-0">
                <button className="relative px-8 py-4 bg-[#131A2A] rounded-full text-lg lg:text-xl font-bold shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_40px_rgba(52,211,153,0.4)] border border-cyan-500/30 overflow-hidden transition-all duration-300">
                  <span className="relative z-10 text-cyan-400 group-hover:text-white transition-colors duration-300">Start Dominating</span>
                  <div className="absolute inset-0 h-full w-0 bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500 ease-out group-hover:w-full z-0"></div>
                </button>
              </Link>

            </motion.div>

          </div>

        </section>
        {/* SECTION: Premium Features Grid */}
        <section className="py-32 bg-[#0A0F1C] relative flex justify-center border-t border-white/5">
          {/* Top glowing line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

          <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
            <div className="text-center mb-20 animate-fade-in">
              <span className="px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold tracking-widest uppercase mb-6 inline-block">
                Enterprise Capabilities
              </span>
              <h2 className="text-4xl md:text-5xl font-black mb-5 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-100 to-indigo-100 drop-shadow-md">
                Unleash the Power of <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 animate-pulse">Digital Out-Of-Home</span>
              </h2>
              <p className="text-blue-200/70 text-lg max-w-2xl mx-auto font-medium">
                Experience next-generation advertising tools designed for ultimate scale, performance, and transparency across the billboard network.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <motion.div whileHover={{ y: -8, scale: 1.02 }} className="bg-[#131A2A]/80 backdrop-blur-md border border-blue-500/20 rounded-3xl p-10 hover:bg-[#1A233A] hover:border-blue-500/50 transition-all duration-500 group shadow-[0_0_20px_rgba(59,130,246,0.05)] hover:shadow-[0_0_40px_rgba(59,130,246,0.2)]">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-500 border border-blue-500/20 group-hover:border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)] group-hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]">
                  <span className="text-3xl text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]">🖥️</span>
                </div>
                <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-blue-400 mb-4 transition-colors">Cross-City Displays</h3>
                <p className="text-blue-100/60 text-sm leading-relaxed font-medium">
                  Connect to thousands of digital billboards nationwide. Deploy and manage high-definition content spanning across multiple geographic regions simultaneously from a single intelligent hub.
                </p>
              </motion.div>

              {/* Feature 2 */}
              <motion.div whileHover={{ y: -8, scale: 1.02 }} className="bg-[#131A2A]/80 backdrop-blur-md border border-purple-500/20 rounded-3xl p-10 hover:bg-[#1A233A] hover:border-purple-500/50 transition-all duration-500 group shadow-[0_0_20px_rgba(168,85,247,0.05)] hover:shadow-[0_0_40px_rgba(168,85,247,0.2)]">
                <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all duration-500 border border-purple-500/20 group-hover:border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)] group-hover:shadow-[0_0_25px_rgba(168,85,247,0.5)]">
                  <span className="text-3xl text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]">⚡</span>
                </div>
                <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-purple-400 mb-4 transition-colors">Live Ad Scheduling</h3>
                <p className="text-purple-100/60 text-sm leading-relaxed font-medium">
                  Precision targeting powered by our dynamic calendar engine. Book highly specific hours of the day to maximize viewer retention, engagement, and optimize advertising spend dynamically.
                </p>
              </motion.div>

              {/* Feature 3 */}
              <motion.div whileHover={{ y: -8, scale: 1.02 }} className="bg-[#131A2A]/80 backdrop-blur-md border border-emerald-500/20 rounded-3xl p-10 hover:bg-[#1A233A] hover:border-emerald-500/50 transition-all duration-500 group shadow-[0_0_20px_rgba(16,185,129,0.05)] hover:shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-500 border border-emerald-500/20 group-hover:border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                  <span className="text-3xl text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]">📊</span>
                </div>
                <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-emerald-400 mb-4 transition-colors">Real-Time Analytics</h3>
                <p className="text-emerald-100/60 text-sm leading-relaxed font-medium">
                  Track active hardware execution, instantly verify air times, and analyze your advertising revenue streams securely through live, transparent dashboard metrics built into the core.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="min-h-screen bg-[#0A0F1C] flex justify-center pb-24 border-t border-white/5">
          <div className="w-full max-w-7.5xl p-2">

            {/* Main Container */}
            <div className="flex gap-1 flex-col lg:flex-row">

              {/* LEFT SIDE - TWO VERTICAL CARDS */}
              <div className="flex flex-col gap-4 w-1/2">
                <motion.div
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.7 }}
                  className="bg-gradient-to-b from-[#131A2A] to-[#0D1320] border border-blue-500/30 rounded-3xl mx-5 shadow-[0_0_40px_rgba(59,130,246,0.1)] p-8 sm:p-12 min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-[0_0_60px_rgba(59,130,246,0.3)] transition-all duration-500"
                >

                  {/* Wrapper to ensure sliders stay completely in the background without overlapping */}
                  <div className="absolute inset-0 z-0 pointer-events-none opacity-30 group-hover:opacity-60 transition-opacity duration-700">
                    {/* TOP HORIZONTAL SLIDER */}
                    <div className="absolute top-4 left-0 w-full overflow-hidden mask-fade-horizontal">
                      <motion.div
                        animate={{ x: ["0%", "-50%"] }}
                        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                        className="flex gap-4 w-max"
                      >
                        <img src={ads1} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover shadow-[0_0_20px_rgba(168,85,247,0.5)] border border-purple-500/50" />
                        <img src={watch} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover shadow-[0_0_15px_rgba(59,130,246,0.4)] border border-blue-500/50" />
                        <img src={ads3} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-500/50" />
                        <img src={makeup} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover shadow-[0_0_15px_rgba(236,72,153,0.4)] border border-pink-500/50" />
                        <img src={buttler} className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover" />
                        <img src={cookie} className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover" />
                        <img src={watch} className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover" />
                        <img src={cloths} className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover" />

                        {/* duplicate for infinite loop */}
                        <img src={ads1} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border border-purple-500/50" />
                        <img src={watch} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border border-blue-500/50" />
                        <img src={ads3} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border border-emerald-500/50" />
                        <img src={makeup} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border border-pink-500/50" />
                        <img src={buttler} className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover" />
                        <img src={cookie} className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover" />
                        <img src={watch} className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover" />
                        <img src={cloths} className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover" />
                      </motion.div>
                    </div>

                    {/* BOTTOM HORIZONTAL SLIDER (REVERSE) */}
                    <div className="absolute bottom-4 left-0 w-full overflow-hidden mask-fade-horizontal">
                      <motion.div
                        animate={{ x: ["-50%", "0%"] }}
                        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                        className="flex gap-4 w-max"
                      >
                        <img src={ads1} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border border-purple-500/50" />
                        <img src={watch} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border border-purple-500/50" />
                        <img src={ads3} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border border-purple-500/50" />
                        <img src={makeup} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border border-purple-500/50" />
                        <img src={coke} className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover" />
                        <img src={colors} className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover" />
                        <img src={bethell} className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover" />
                        <img src={donut} className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover" />
                        
                        {/* duplicate */}
                        <img src={ads1} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border border-purple-500/50" />
                        <img src={watch} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border border-purple-500/50" />
                        <img src={ads3} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border border-purple-500/50" />
                        <img src={makeup} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border border-purple-500/50" />
                        <img src={coke} className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover" />
                        <img src={colors} className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover" />
                        <img src={bethell} className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover" />
                        <img src={donut} className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover" />
                      </motion.div>
                    </div>
                  </div>

                  {/* CENTER TEXT (Flexible Layout) */}
                  <div className="relative z-10 w-full text-center px-4 sm:px-10 bg-black/60 backdrop-blur-2xl border border-blue-500/30 rounded-3xl py-10 sm:py-14 shadow-[0_0_40px_rgba(0,0,0,0.8)] mt-auto mb-auto my-12 group-hover:border-blue-400/50 transition-colors duration-500">
                    <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-400 to-pink-500 mb-6 drop-shadow-[0_0_15px_rgba(236,72,153,0.6)]">
                      Advertisement Upload & Content Management
                    </h1>

                    <p className="text-base sm:text-lg font-medium text-blue-100/80 leading-relaxed mb-6 px-4">
                      Advertisers can schedule advertisements based on specific dates,
                      times, and locations. The system enables automated campaign
                      management, ensuring ads appear at the right time for the right
                      audience and maximizing advertising impact.
                    </p>
                  </div>

                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -80 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.7 }}
                  className="bg-gradient-to-b from-[#131A2A] to-[#0A131C] border border-emerald-500/30 rounded-3xl mx-5 p-8 sm:p-12 min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.1)] group hover:shadow-[0_0_60px_rgba(16,185,129,0.3)] transition-all duration-500 mt-4"
                >

                  <div className="absolute inset-0 z-0 pointer-events-none opacity-30 group-hover:opacity-60 transition-opacity duration-700">
                    <div className="absolute left-4 top-0 h-full overflow-hidden mask-fade-vertical">
                      <motion.div
                        animate={{ y: ["0%", "-50%"] }}
                        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                        className="flex flex-col gap-4"
                      >
                        {/* original images */}
                        <img src={ads2} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-500/30" />
                        <img src={baby3} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-500/30" />
                        <img src={coke} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />
                        <img src={colors} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />
                        <img src={bethell} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />
                        <img src={donut} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />

                        {/* duplicated images for seamless loop */}
                        <img src={ads2} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />
                        <img src={baby3} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />
                        <img src={coke} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />
                        <img src={colors} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />
                        <img src={bethell} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />
                        <img src={donut} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />
                      </motion.div>
                    </div>

                    {/* RIGHT VERTICAL SLIDER */}
                    <div className="absolute right-4 top-0 h-full overflow-hidden mask-fade-vertical">
                      <motion.div
                        animate={{ y: ["-50%", "0%"] }}
                        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                        className="flex flex-col gap-4"
                      >
                        {/* original images */}
                        <img src={buttler} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.4)]" />
                        <img src={cookie} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.4)]" />
                        <img src={watch} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />
                        <img src={cloths} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />
                        <img src={img1} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />
                        <img src={buildings} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />

                        {/* duplicated */}
                        <img src={buttler} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />
                        <img src={cookie} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />
                        <img src={watch} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />
                        <img src={cloths} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />
                        <img src={img1} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />
                        <img src={buildings} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />
                      </motion.div>
                    </div>
                  </div>

                  {/* CENTER TEXT */}
                  <div className="relative z-10 w-full text-center px-4 sm:px-10 bg-black/60 backdrop-blur-2xl border border-emerald-500/30 py-10 sm:py-14 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.8)] mt-auto mb-auto my-12 group-hover:border-emerald-400/50 transition-colors duration-500">
                    <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-500 mb-6 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse">
                      Real-Time Billboard Monitoring
                    </h2>

                    <p className="text-base sm:text-lg font-medium text-emerald-100/80 leading-relaxed px-2 sm:px-8">
                      Track billboard activity and analyze advertisement performance
                      through a centralized monitoring system that provides live
                      insights and campaign control.
                    </p>
                  </div>

                </motion.div>
              </div>
              <motion.div
                initial={{ opacity: 0, x: 80 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7 }}
                className="w-full lg:w-1/2 relative bg-gradient-to-br from-[#131A2A] to-[#1A0B16] border border-pink-500/30 rounded-3xl mx-4 lg:mx-2 shadow-[0_0_50px_rgba(236,72,153,0.1)] p-10 min-h-[85vh] overflow-hidden flex flex-col items-center justify-center mt-7 lg:mt-0 group hover:shadow-[0_0_80px_rgba(236,72,153,0.25)] transition-shadow duration-500"
              >
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[120px] pointer-events-none group-hover:bg-pink-600/20 transition-colors duration-700" />

                {/* CENTER TEXT */}
                <div className="relative text-center max-w-xl z-10 px-6 py-10 bg-black/40 backdrop-blur-md rounded-3xl border border-pink-500/20 group-hover:border-pink-500/40 transition-colors duration-500 shadow-2xl">
                  <div className="w-20 h-20 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.4)] group-hover:scale-110 transition-transform duration-500 group-hover:shadow-[0_0_30px_rgba(236,72,153,0.6)]">
                    <span className="text-4xl drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]">🎯</span>
                  </div>
                  <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-400 mb-6 leading-tight drop-shadow-md">
                    Smart Advertisement Scheduling
                  </h2>

                  <p className="text-lg font-medium text-pink-100/80 leading-relaxed mb-10">
                    Control when and where advertisements appear across multiple digital
                    billboards and manage campaigns efficiently. Schedule your campaigns with
                    precision, monitor real-time performance, and optimize your ad placements
                    to maximize audience engagement and ROI across all locations.
                  </p>
                  <Link to="/Login" className="hover:text-white transition-colors">
                    <button className="w-64 bg-gradient-to-r from-pink-500 to-purple-600 text-white border border-white/10 py-4 rounded-full text-lg font-bold shadow-[0_0_20px_rgba(236,72,153,0.5)] hover:scale-105 transition duration-300">
                      Get Started
                    </button>
                  </Link>

                </div>

              </motion.div>
            </div>
          </div>
        </section>

        <section className="relative min-h-screen flex flex-col items-center overflow-hidden bg-[#0A0F1C] border-t border-white/5">

          <div className="w-full max-w-7xl px-8 py-32 flex flex-col justify-between flex-grow">

            {/* TOP CARDS */}

            <div className="flex justify-center gap-6 flex-wrap">

              <div className="group h-28 w-40 bg-[#131A2A] border border-blue-500/20 rounded-2xl flex flex-col justify-center items-center text-gray-300 font-bold shadow-xl 
hover:bg-[#1A233A] hover:border-blue-500/50 hover:text-white transition-all duration-300 translate-y-6 hover:-translate-y-2">
                <h3>Ad Upload</h3>
                <p className="text-sm text-gray-500">Easy campaign setup</p>
              </div>

              <div className="group h-28 w-56 bg-[#131A2A] border border-purple-500/20 rounded-full flex flex-col justify-center items-center text-gray-300 font-bold shadow-xl 
hover:bg-[#1A233A] hover:border-purple-500/50 hover:text-white transition-all duration-300 -translate-y-4 hover:-translate-y-6">
                <h3>Scheduling</h3>
                <p className="text-sm text-gray-500">Time based ads</p>
              </div>

              <div className="group h-28 w-44 bg-[#131A2A] border border-emerald-500/20 rounded-2xl flex flex-col justify-center items-center text-gray-300 font-bold shadow-xl 
hover:bg-[#1A233A] hover:border-emerald-500/50 hover:text-white transition-all duration-300 translate-y-10 hover:-translate-y-2">
                <h3>Analytics</h3>
                <p className="text-sm text-gray-500">Track performance</p>
              </div>

              <div className="group h-28 w-64 bg-[#131A2A] border border-pink-500/20 rounded-[40px] flex flex-col justify-center items-center text-gray-300 font-bold shadow-xl 
hover:bg-[#1A233A] hover:border-pink-500/50 hover:text-white transition-all duration-300 -translate-y-6 hover:-translate-y-6">
                <h3>Campaign Control</h3>
                <p className="text-sm text-gray-500">Manage all ads</p>
              </div>

              <div className="group h-28 w-36 bg-[#131A2A] border border-orange-500/20 rounded-full flex flex-col justify-center items-center text-gray-300 font-bold shadow-xl 
hover:bg-[#1A233A] hover:border-orange-500/50 hover:text-white transition-all duration-300 translate-y-2 hover:-translate-y-4">
                <h3>Reach</h3>
                <p className="text-sm text-gray-500">Wider audience</p>
              </div>

            </div>


            {/* CENTER HEADING */}
            <div className="text-center py-32 relative">
              {/* Optional elegant glow behind the heading */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-[100px] pointer-events-none rounded-full" />
              
              <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-indigo-100 to-indigo-300 leading-tight drop-shadow-md">
                Smart Billboard Advertising
              </h1>

              <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 mt-4 animate-pulse drop-shadow-sm">
                Powered by Centralized Control
              </h2>
            </div>


            {/* BOTTOM CARDS */}

            <div className="flex justify-center gap-6 flex-wrap">

              <div className="group h-28 w-44 bg-[#131A2A] border border-rose-500/20 rounded-2xl flex flex-col justify-center items-center text-gray-300 font-bold shadow-xl 
hover:bg-[#1A233A] hover:border-rose-500/50 hover:text-white transition-all duration-300 -translate-y-6 hover:-translate-y-8">
                <h3>Real Time Data</h3>
                <p className="text-sm text-gray-500">Live monitoring</p>
              </div>

              <div className="group h-28 w-60 bg-[#131A2A] border border-indigo-500/20 rounded-full flex flex-col justify-center items-center text-gray-300 font-bold shadow-xl 
hover:bg-[#1A233A] hover:border-indigo-500/50 hover:text-white transition-all duration-300 translate-y-8 hover:-translate-y-4">
                <h3>Digital Network</h3>
                <p className="text-sm text-gray-500">Multiple billboards</p>
              </div>

              <div className="group h-28 w-36 bg-[#131A2A] border border-blue-500/20 rounded-2xl flex flex-col justify-center items-center text-gray-300 font-bold shadow-xl 
hover:bg-[#1A233A] hover:border-blue-500/50 hover:text-white transition-all duration-300 -translate-y-2 hover:-translate-y-8">
                <h3>Control</h3>
                <p className="text-sm text-gray-500">Central system</p>
              </div>

              <div className="group h-28 w-64 bg-[#131A2A] border border-teal-500/20 rounded-[40px] flex flex-col justify-center items-center text-gray-300 font-bold shadow-xl 
hover:bg-[#1A233A] hover:border-teal-500/50 hover:text-white transition-all duration-300 translate-y-6 hover:-translate-y-6">
                <h3>Ad Optimization</h3>
                <p className="text-sm text-gray-500">Better engagement</p>
              </div>

              <div className="group h-28 w-40 bg-[#131A2A] border border-amber-500/20 rounded-full flex flex-col justify-center items-center text-gray-300 font-bold shadow-xl 
hover:bg-[#1A233A] hover:border-amber-500/50 hover:text-white transition-all duration-300 -translate-y-4 hover:-translate-y-8">
                <h3>Performance</h3>
                <p className="text-sm text-gray-500">Campaign insights</p>
              </div>

            </div>

          </div>

        </section>


        <section className="min-h-[120vh] bg-[#0A0F1C] border-t border-white/5 flex flex-col items-center relative py-20 pb-0">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 to-transparent pointer-events-none" />

          <div className="w-full max-w-5xl px-8 flex flex-col flex-grow relative z-10">

            {/* FAQ CONTENT AREA */}

            <div className="flex flex-col gap-6 mb-16">

              {faqData.map((item, index) => (

                <div
                  key={index}
                  className="bg-[#131A2A] hover:bg-[#1A233A] transition-colors duration-300 rounded-2xl border border-white/5 overflow-hidden shadow-lg"
                >

                  {/* Question */}

                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full flex items-center justify-between px-8 py-6 text-white text-lg font-bold group"
                  >

                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-300 group-hover:from-blue-300 group-hover:to-purple-400 transition-all duration-300">{item.question}</span>

                    <motion.span
                      animate={{ rotate: openIndex === index ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-blue-500 shadow-blue-500/50 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)] shrink-0 ml-4 group-hover:text-purple-400 transition-colors"
                    >
                      <FaChevronDown />
                    </motion.span>

                  </button>

                  {/* Answer */}

                  <AnimatePresence>

                    {openIndex === index && (

                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="px-8 pb-6 text-indigo-100/70 font-medium leading-relaxed"
                      >

                        {item.answer}

                      </motion.div>

                    )}

                  </AnimatePresence>

                </div>

              ))}

            </div>


            {/* FOOTER */}

            <footer className="w-full bg-[#131A2A] border border-white/5 text-white py-16 rounded-[2.5rem] mt-auto relative shadow-2xl overflow-hidden group mb-10">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 group-hover:from-blue-600/10 group-hover:to-purple-600/10 transition-all duration-700 pointer-events-none" />

              <div className="max-w-5xl w-full px-10 mx-auto relative z-10">

                {/* Columns */}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12 text-sm">

                  <div>
                    <h3 className="text-lg font-bold mb-6 text-white">Legal</h3>
                    <ul className="space-y-3 text-gray-400 font-medium">
                      <li className="hover:text-blue-400 cursor-pointer transition-colors">Privacy Policy</li>
                      <li className="hover:text-blue-400 cursor-pointer transition-colors">Terms of Service</li>
                      <li className="hover:text-blue-400 cursor-pointer transition-colors">Cookie Policy</li>
                      <li className="hover:text-blue-400 cursor-pointer transition-colors">Disclaimer</li>
                      <li className="hover:text-blue-400 cursor-pointer transition-colors">Refund Policy</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold mb-6 text-white">Rights</h3>
                    <ul className="space-y-3 text-gray-400 font-medium">
                      <li className="hover:text-purple-400 cursor-pointer transition-colors">All rights reserved</li>
                      <li className="text-gray-500">Copyright © 2026</li>
                      <li className="hover:text-purple-400 cursor-pointer transition-colors">Intellectual Property</li>
                      <li className="hover:text-purple-400 cursor-pointer transition-colors">Usage Rights</li>
                      <li className="hover:text-purple-400 cursor-pointer transition-colors">Brand Guidelines</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold mb-6 text-white">Website</h3>
                    <ul className="space-y-3 text-gray-400 font-medium">
                      <li className="hover:text-emerald-400 cursor-pointer transition-colors">Home</li>
                      <li className="hover:text-emerald-400 cursor-pointer transition-colors">About Us</li>
                      <li className="hover:text-emerald-400 cursor-pointer transition-colors">Services</li>
                      <li className="hover:text-emerald-400 cursor-pointer transition-colors">Blog</li>
                      <li className="hover:text-emerald-400 cursor-pointer transition-colors">Careers</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold mb-6 text-white">Contact</h3>
                    <ul className="space-y-3 text-gray-400 font-medium">
                      <li className="hover:text-rose-400 cursor-pointer transition-colors">Email: info@cdbms.com</li>
                      <li className="hover:text-rose-400 cursor-pointer transition-colors">Phone: +123 456 7890</li>
                      <li className="hover:text-rose-400 cursor-pointer transition-colors">Support Center</li>
                      <li className="hover:text-rose-400 cursor-pointer transition-colors">FAQ</li>
                      <li className="hover:text-rose-400 cursor-pointer transition-colors">Live Chat</li>
                    </ul>
                  </div>

                </div>

                <div className="border-t border-white/10 mb-8"></div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8">

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-blue-600 border border-blue-500 hover:bg-blue-500 px-8 py-3.5 rounded-full text-white font-bold shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all"
                  >
                    Subscribe to Updates
                  </motion.button>

                  <div className="flex gap-4">

                    {[FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn, FaYoutube].map((Icon, idx) => (

                      <motion.div
                        key={idx}
                        whileHover={{ y: -3, scale: 1.1 }}
                        className="p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors group"
                      >
                        <Icon className="text-gray-400 group-hover:text-white text-lg transition-colors" />
                      </motion.div>

                    ))}

                  </div>

                </div>

              </div>

            </footer>

          </div>

        </section>
      </div>
    </div>
  );
}
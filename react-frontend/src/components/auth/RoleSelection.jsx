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
        <section className="relative min-h-screen flex flex-col justify-center items-center p-3">
          <img src={img} alt="background" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center">
            <div className="text-center font-bold text-white text-5xl px-4 mb-10">
              CENTRALIZED DIGITAL BILLBOARD <br />
              <span className="text-4xl mt-2 block">MANAGEMENT SYSTEM</span>
            </div>

            <div className="flex gap-10 mt-10">
  {/* Admin Card – flip on hover, no navigation */}
  <div className="group w-60 h-44 [perspective:1000px]">
    <div className="relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
      {/* Front side */}
      <div className="absolute w-full h-full rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 flex flex-col items-center justify-center text-white shadow-xl [backface-visibility:hidden]">
        <FaUserShield className="text-5xl mb-3" />
        <span className="text-xl font-medium">Admin</span>
      </div>
      {/* Back side */}
      <div className="absolute w-full h-full rounded-2xl backdrop-blur-lg bg-black/80 border border-white/20 flex items-center justify-center text-white text-sm font-medium p-4 text-center [transform:rotateY(180deg)] [backface-visibility:hidden]">
        Manage billboards, users, payments, and system settings.<br />
        Full control over all advertisements.
      </div>
    </div>
  </div>

  {/* Advertiser Card – flip on hover, no navigation */}
  <div className="group w-60 h-44 [perspective:1000px]">
    <div className="relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
      {/* Front side */}
      <div className="absolute w-full h-full rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 flex flex-col items-center justify-center text-white shadow-xl [backface-visibility:hidden]">
        <FaBullhorn className="text-5xl mb-3" />
        <span className="text-xl font-medium">Advertiser</span>
      </div>
      {/* Back side */}
      <div className="absolute w-full h-full rounded-2xl backdrop-blur-lg bg-black/80 border border-white/20 flex items-center justify-center text-white text-sm font-medium p-4 text-center [transform:rotateY(180deg)] [backface-visibility:hidden]">
        Upload ads, book billboards, track campaign performance,<br />
        and manage payments.
      </div>
    </div>
  </div>
</div>
          </div>
        </section>

        {/* SECTION 2: Sliders */}
        <section className="min-h-screen flex flex-col justify-center items-center bg-black">
          <Slider reverse={false} speed={22} />
          <Slider reverse={true} speed={27} />
          <Slider reverse={false} speed={20} />
        </section>
        {/* Other sections */}
     <section className="min-h-screen flex items-center justify-center bg-blue-600 px-12">

  <div className="max-w-7xl w-full flex items-center gap-16">

    {/* LEFT SIDE — ROTATING WHEEL */}
    <div className="flex-1 flex justify-start">

      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          repeat: Infinity,
          duration: 25,
          ease: "linear"
        }}
        className="relative w-[520px] h-[520px]"
      >
        {wheelImages.map((img, index) => {
          const angle = (360 / wheelImages.length) * index;

          return (
            <motion.div
              key={index}
              className="absolute top-1/2 left-1/2"
              style={{
                transform: `rotate(${angle}deg) translate(220px) rotate(-${angle}deg)`
              }}
            >
              <motion.img
                src={img}
                className="w-28 h-28 object-cover rounded-full border-4 border-white shadow-xl"
                animate={{ rotate: -360 }}
                transition={{
                  repeat: Infinity,
                  duration: 25,
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
      transition={{ duration: 0.7 }}
      className="flex-1 flex flex-col justify-center pr-10"
    >

      {/* Heading */}
      <h1 className="text-5xl font-extrabold text-cyan-400 text-shadow-emerald-400 leading-tight font-sans text-">
        Upload And Showcase Your Ads Across Every Digital Billboard
      </h1>

      {/* Paragraph */}
      <p className="text-xl font-semibold text-emerald-200 leading-relaxed mt-2 max-w-lg">
        Our centralized digital billboard management system allows advertisers
        to seamlessly upload and manage advertisements across multiple
        locations with powerful analytics and scheduling tools to maximize
        audience reach and campaign performance.
      </p>

      {/* Button */}
      <Link to="/Login" className="hover:text-[#D97706] transition-colors">
      <button className="mt-6 w-64 bg-cyan-500 text-white py-4 rounded-full text-xl font-bold shadow-xl hover:bg-blue-700 hover:scale-105 transition duration-300">
        Get Started
      </button>
     </Link>

    </motion.div>

  </div>

</section>
    <section className="relative min-h-screen flex flex-col items-center overflow-hidden">

      {/* Background Image */}
      <img
        src={buildings}
        alt="background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/1"></div>

      {/* Content */}
      <div className="relative z-10 w-full flex flex-col items-left gap-12 mt-20 m-5">

        {/* Sliding Heading */}
        <div className="w-full overflow-hidden">
          <motion.div
            animate={{ x: ["0%", "-100%"] }}
            transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
            className="whitespace-nowrap flex gap-20 text-purple-900 text-5xl font-extrabold"
          >
            <span>{headingText}</span>
            <span>{headingText}</span>
            <span>{headingText}</span>
          </motion.div>
        </div>

        {/* Cards Section */}
        <div className="flex flex-col items-left gap-8 p-7">

          {/* Top 2 Cards */}
          <div className="flex gap-8">
            <motion.div
              animate={{ opacity: [1, 0.6, 1], scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-52 h-36 bg-purple-800 border border-purple-400 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg"
            >
              <span className="text-5xl mb-2">🖥️</span>
              <p className="font-bold">Digital Displays</p>
            </motion.div>

            <motion.div
              animate={{ opacity: [1, 0.6, 1], scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2, delay: 1 }}
              className="w-52 h-36 bg-purple-800 border border-purple-400 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg"
            >
              <span className="text-5xl mb-2">📺</span>
              <p className="font-bold">Billboard Network</p>
            </motion.div>
            <motion.div
              animate={{ opacity: [1, 0.6, 1], scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-52 h-36 bg-purple-800 border border-purple-400 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg"
            >
              <span className="text-5xl mb-2">⏰</span>
              <p className="font-bold">Ad Scheduling System</p>
            </motion.div>
          </div>

          <div className="flex gap-8">
          <motion.div
            animate={{ opacity: [1, 0.6, 1], scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
            className="w-72 h-44 bg-purple-800 border border-purple-400 rounded-2xl flex flex-col items-center justify-center text-white shadow-xl"
          >
            <span className="text-6xl mb-3">🗂️</span>
            <p className="font-bold text-lg">Centralized Control Panel</p>
          </motion.div>
          <motion.div
            animate={{ opacity: [1, 0.6, 1], scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
            className="w-72 h-44 bg-purple-800 border border-purple-400 rounded-2xl flex flex-col items-center justify-center text-white shadow-xl"
          >
            <span className="text-6xl mb-3">📊</span>
            <p className="font-bold text-lg">Real-Time Analytics Dashboard</p>
          </motion.div>
          </div>
          </div>
        </div>
    </section>

     <section className="min-h-screen bg-white flex justify-center">
  <div className="w-full max-w-7.5xl p-2">

    {/* Main Container */}
    <div className="flex gap-1">

      {/* LEFT SIDE - TWO VERTICAL CARDS */}
      <div className="flex flex-col gap-4 w-1/2 mt-7 pl-15">

       <motion.div
  initial={{ opacity: 0, x: -80 }}
  whileInView={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.7 }}
  className="bg-blue-400 rounded-xl mx-5 shadow-xl p-5 min-h-[80vh] relative flex items-center justify-center overflow-hidden"
>

  {/* TOP HORIZONTAL SLIDER */}
  <div className="absolute top-5 left-0 w-full overflow-hidden">
    <motion.div
      animate={{ x: ["0%", "-50%"] }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="flex gap-4 w-max"
    >
      <img src={ads1} className="h-24 w-24 rounded-2xl object-cover border border-purple-700" />
      <img src={watch} className="h-24 w-24 rounded-2xl object-cover border border-purple-700" />
      <img src={ads3} className="h-24 w-24 rounded-2xl object-cover border border-purple-700" />
      <img src={makeup} className="h-24 w-24 rounded-2xl object-cover border border-purple-700" />
       <img src={buttler} className="w-24 h-24 rounded-xl object-cover" />
    <img src={cookie} className="w-24 h-24 rounded-xl object-cover" />
    <img src={watch} className="w-24 h-24 rounded-xl object-cover" />
    <img src={cloths} className="w-24 h-24 rounded-xl object-cover" />

      {/* duplicate for infinite loop */}
      <img src={ads1} className="h-24 w-24 rounded-2xl object-cover border border-purple-700" />
      <img src={watch} className="h-24 w-24 rounded-2xl object-cover border border-purple-700" />
      <img src={ads3} className="h-24 w-24 rounded-2xl object-cover border border-purple-700" />
      <img src={makeup} className="h-24 w-24 rounded-2xl object-cover border border-purple-700" />
       <img src={buttler} className="w-24 h-24 rounded-xl object-cover" />
    <img src={cookie} className="w-24 h-24 rounded-xl object-cover" />
    <img src={watch} className="w-24 h-24 rounded-xl object-cover" />
    <img src={cloths} className="w-24 h-24 rounded-xl object-cover" />
    </motion.div>
  </div>

  {/* BOTTOM HORIZONTAL SLIDER (REVERSE) */}
  <div className="absolute bottom-5 left-0 w-full overflow-hidden">
    <motion.div
      animate={{ x: ["-50%", "0%"] }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="flex gap-4 w-max"
    >
      <img src={ads1} className="h-24 w-24 rounded-2xl object-cover border border-purple-700" />
      <img src={watch} className="h-24 w-24 rounded-2xl object-cover border border-purple-700" />
      <img src={ads3} className="h-24 w-24 rounded-2xl object-cover border border-purple-700" />
      <img src={makeup} className="h-24 w-24 rounded-2xl object-cover border border-purple-700" />
       <img src={coke} className="w-24 h-24 rounded-xl object-cover" />
    <img src={colors} className="w-24 h-24 rounded-xl object-cover" />
    <img src={bethell} className="w-24 h-24 rounded-xl object-cover" />
    <img src={donut} className="w-24 h-24 rounded-xl object-cover" />

      {/* duplicate */}
      <img src={ads1} className="h-24 w-24 rounded-2xl object-cover border border-purple-700" />
      <img src={watch} className="h-24 w-24 rounded-2xl object-cover border border-purple-700" />
      <img src={ads3} className="h-24 w-24 rounded-2xl object-cover border border-purple-700" />
      <img src={makeup} className="h-24 w-24 rounded-2xl object-cover border border-purple-700" />
       <img src={coke} className="w-24 h-24 rounded-xl object-cover" />
    <img src={colors} className="w-24 h-24 rounded-xl object-cover" />
    <img src={bethell} className="w-24 h-24 rounded-xl object-cover" />
    <img src={donut} className="w-24 h-24 rounded-xl object-cover" />
    </motion.div>
  </div>

  {/* CENTER TEXT */}
  <div className="text-center max-w-xl z-10 px-10 gap-5">
    <h1 className="text-5xl font-extrabold text-blue-950 mt-30">
      Advertisement Upload & Content Management
    </h1>

    <p className="text-lg font-semibold text-blue-900 leading-relaxed mb-29 ">
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
  className="bg-lime-600 rounded-xl shadow-xl mx-5 p-10 min-h-[70vh] relative flex items-center justify-center overflow-hidden"
>

  <div className="absolute left-6 top-0 h-full overflow-hidden flex items-center">
  <motion.div
    animate={{ y: ["0%", "-50%"] }}
    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    className="flex flex-col gap-4"
  >
    {/* original images */}
    <img src={ads2} className="w-24 h-24 rounded-xl object-cover" />
    <img src={baby3} className="w-24 h-24 rounded-xl object-cover" />
    <img src={coke} className="w-24 h-24 rounded-xl object-cover" />
    <img src={colors} className="w-24 h-24 rounded-xl object-cover" />
    <img src={bethell} className="w-24 h-24 rounded-xl object-cover" />
    <img src={donut} className="w-24 h-24 rounded-xl object-cover" />

    {/* duplicated images for seamless loop */}
    <img src={ads2} className="w-24 h-24 rounded-xl object-cover" />
    <img src={baby3} className="w-24 h-24 rounded-xl object-cover" />
    <img src={coke} className="w-24 h-24 rounded-xl object-cover" />
    <img src={colors} className="w-24 h-24 rounded-xl object-cover" />
    <img src={bethell} className="w-24 h-24 rounded-xl object-cover" />
    <img src={donut} className="w-24 h-24 rounded-xl object-cover" />
  </motion.div>
</div>

{/* RIGHT VERTICAL SLIDER */}
<div className="absolute right-6 top-0 h-full overflow-hidden flex items-center">
  <motion.div
    animate={{ y: ["-50%", "0%"] }}
    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    className="flex flex-col gap-4"
  >
    {/* original images */}
    <img src={buttler} className="w-24 h-24 rounded-xl object-cover" />
    <img src={cookie} className="w-24 h-24 rounded-xl object-cover" />
    <img src={watch} className="w-24 h-24 rounded-xl object-cover" />
    <img src={cloths} className="w-24 h-24 rounded-xl object-cover" />
    <img src={img1} className="w-24 h-24 rounded-xl object-cover" />
    <img src={buildings} className="w-24 h-24 rounded-xl object-cover" />

    {/* duplicated */}
    <img src={buttler} className="w-24 h-24 rounded-xl object-cover" />
    <img src={cookie} className="w-24 h-24 rounded-xl object-cover" />
    <img src={watch} className="w-24 h-24 rounded-xl object-cover" />
    <img src={cloths} className="w-24 h-24 rounded-xl object-cover" />
    <img src={img1} className="w-24 h-24 rounded-xl object-cover" />
    <img src={buildings} className="w-24 h-24 rounded-xl object-cover" />
  </motion.div>
</div>

  {/* CENTER TEXT */}
  <div className="text-center max-w-xl z-10 pl-8">
    <h2 className="text-5xl font-extrabold text-green-950 mb-4 pl-10 pr-10">
      Real-Time Billboard Monitoring
    </h2>

    <p className="text-lg font-semibold text-green-900 leading-relaxed pl-20 pr-20">
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
  className="relative bg-gradient-to-r from-pink-950 via-pink-900 to-pink-950 rounded-xl mx-2 shadow-xl p-10 min-h-[146vh] overflow-hidden flex flex-col items-center justify-center"
>

  {/* CENTER TEXT */}
  <div className="text-center max-w-xl z-10">
    <h2 className="text-5xl font-extrabold text-pink-200 mb-4">
      Smart Advertisement Scheduling
    </h2>

    <p className="text-lg font-semibold text-pink-100 leading-relaxed mb-8">
      Control when and where advertisements appear across multiple digital
  billboards and manage campaigns efficiently. Schedule your campaigns with
  precision, monitor real-time performance, and optimize your ad placements
  to maximize audience engagement and ROI across all locations.
    </p>
        <Link to="/Login" className="hover:text-[#D97706] transition-colors">
    <button className="mt-6 w-64 bg-pink-100 text-pink-950 py-4 rounded-full text-xl font-bold shadow-xl hover:bg-blue-700 hover:scale-105 transition duration-300">
        Get Started
      </button>
  </Link>

  </div>

</motion.div>
  </div>
  </div>
</section>

    <section className="relative min-h-screen flex flex-col items-center overflow-hidden bg-orange-950">

<div className="w-full max-w-7xl px-8 py-20 flex flex-col justify-between flex-grow">

{/* TOP CARDS */}

<div className="flex justify-center gap-6 flex-wrap">

<div className="group h-28 w-40 bg-[#D2A679] rounded-xl flex flex-col justify-center items-center text-[#3B2F2F] font-bold shadow-xl 
hover:bg-[#3B2F2F] hover:text-[#D2A679] transition-all duration-300 translate-y-6 hover:translate-y-9">
<h3>Ad Upload</h3>
<p className="text-sm">Easy campaign setup</p>
</div>

<div className="group h-28 w-56 bg-[#C19A6B] rounded-full flex flex-col justify-center items-center text-[#3B2F2F] font-bold shadow-xl 
hover:bg-[#3B2F2F] hover:text-[#C19A6B] transition-all duration-300 -translate-y-4 hover:translate-y-9">
<h3>Scheduling</h3>
<p className="text-sm">Time based ads</p>
</div>

<div className="group h-28 w-44 bg-[#8B5E3C] rounded-2xl flex flex-col justify-center items-center text-[#FFF4E1] font-bold shadow-xl 
hover:bg-[#FFF4E1] hover:text-[#8B5E3C] transition-all duration-300 translate-y-10 hover:translate-y-15">
<h3>Analytics</h3>
<p className="text-sm">Track performance</p>
</div>

<div className="group h-28 w-64 bg-[#7B3F00] rounded-[40px] flex flex-col justify-center items-center text-[#FFF4E1] font-bold shadow-xl 
hover:bg-[#FFF4E1] hover:text-[#7B3F00] transition-all duration-300 -translate-y-6 hover:translate-y-9">
<h3>Campaign Control</h3>
<p className="text-sm">Manage all ads</p>
</div>

<div className="group h-28 w-36 bg-[#B08968] rounded-full flex flex-col justify-center items-center text-[#3B2F2F] font-bold shadow-xl 
hover:bg-[#3B2F2F] hover:text-[#B08968] transition-all duration-300 translate-y-2 hover:translate-y-15">
<h3>Reach</h3>
<p className="text-sm">Wider audience</p>
</div>

</div>


{/* CENTER HEADING */}

<div className="text-center py-24">

<h1 className="text-6xl font-extrabold text-[#FFF4E1] leading-tight">
Smart Billboard Advertising
</h1>

<h2 className="text-5xl font-extrabold text-[#FFF4E1] mt-3">
Powered by Centralized Control
</h2>

</div>


{/* BOTTOM CARDS */}

<div className="flex justify-center gap-6 flex-wrap">

<div className="group h-28 w-44 bg-[#C19A6B] rounded-xl flex flex-col justify-center items-center text-[#3B2F2F] font-bold shadow-xl 
hover:bg-[#3B2F2F] hover:text-[#C19A6B] transition-all duration-300 -translate-y-6 hover:-translate-y-9">
<h3>Real Time Data</h3>
<p className="text-sm">Live monitoring</p>
</div>

<div className="group h-28 w-60 bg-[#8B5E3C] rounded-full flex flex-col justify-center items-center text-[#FFF4E1] font-bold shadow-xl 
hover:bg-[#FFF4E1] hover:text-[#8B5E3C] transition-all duration-300 translate-y-8 hover:-translate-y-9">
<h3>Digital Network</h3>
<p className="text-sm">Multiple billboards</p>
</div>

<div className="group h-28 w-36 bg-[#D2A679] rounded-2xl flex flex-col justify-center items-center text-[#3B2F2F] font-bold shadow-xl 
hover:bg-[#3B2F2F] hover:text-[#D2A679] transition-all duration-300 -translate-y-2 hover:-translate-y-9">
<h3>Control</h3>
<p className="text-sm">Central system</p>
</div>

<div className="group h-28 w-64 bg-[#7B3F00] rounded-[40px] flex flex-col justify-center items-center text-[#FFF4E1] font-bold shadow-xl 
hover:bg-[#FFF4E1] hover:text-[#7B3F00] transition-all duration-300 translate-y-6 hover:-translate-y-9">
<h3>Ad Optimization</h3>
<p className="text-sm">Better engagement</p>
</div>

<div className="group h-28 w-40 bg-[#B08968] rounded-full flex flex-col justify-center items-center text-[#3B2F2F] font-bold shadow-xl 
hover:bg-[#3B2F2F] hover:text-[#B08968] transition-all duration-300 -translate-y-4 hover:-translate-y-9">
<h3>Performance</h3>
<p className="text-sm">Campaign insights</p>
</div>

</div>

</div>

</section>


<section className="min-h-[170vh] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex flex-col items-center">

<div className="w-full max-w-5xl px-8 py-16 flex flex-col flex-grow">

{/* FAQ CONTENT AREA */}

<div className="flex flex-col gap-6 mb-16">

{faqData.map((item, index) => (

<div
key={index}
className="bg-black/50 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden"
>

{/* Question */}

<button
onClick={() => setOpenIndex(openIndex === index ? null : index)}
className="w-full flex items-center justify-between px-6 py-5 text-white text-lg font-semibold"
>

<span>{item.question}</span>

<motion.span
animate={{ rotate: openIndex === index ? 180 : 0 }}
transition={{ duration: 0.3 }}
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
className="px-6 pb-5 text-gray-200"
>

{item.answer}

</motion.div>

)}

</AnimatePresence>

</div>

))}

</div>


{/* FOOTER */}

<footer className="bg-gray-900 text-white py-12 rounded-3xl mt-auto mb-10">

<div className="max-w-5xl w-full px-6 mx-auto">

{/* Columns */}

<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-1 text-center md:text-left">

<div>
<h3 className="text-xl font-bold mb-4">Legal</h3>
<ul className="space-y-2 text-gray-300">
<li>Privacy Policy</li>
<li>Terms of Service</li>
<li>Cookie Policy</li>
<li>Disclaimer</li>
<li>Refund Policy</li>
</ul>
</div>

<div>
<h3 className="text-xl font-bold mb-4">Rights</h3>
<ul className="space-y-2 text-gray-300">
<li>All rights reserved</li>
<li>Copyright © 2026</li>
<li>Intellectual Property</li>
<li>Usage Rights</li>
<li>Brand Guidelines</li>
</ul>
</div>

<div>
<h3 className="text-xl font-bold mb-4">Website</h3>
<ul className="space-y-2 text-gray-300">
<li>Home</li>
<li>About Us</li>
<li>Services</li>
<li>Blog</li>
<li>Careers</li>
</ul>
</div>

<div>
<h3 className="text-xl font-bold mb-4">Contact</h3>
<ul className="space-y-2 text-gray-300">
<li>Email: info@cdbms.com</li>
<li>Phone: +123 456 7890</li>
<li>Support Center</li>
<li>FAQ</li>
<li>Live Chat</li>
</ul>
</div>

</div>

<div className="border-t border-gray-700 mb-6"></div>

<div className="flex flex-col md:flex-row items-center justify-between gap-6">

<motion.button
whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(59,130,246,0.8)" }}
className="bg-blue-600 px-8 py-4 rounded-full text-white font-semibold shadow-lg"
>
Subscribe Now
</motion.button>

<div className="flex gap-6">

{[FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn, FaYoutube].map((Icon, idx) => (

<motion.div
key={idx}
animate={{ scale: [1,1.2,1] }}
transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: idx * 0.2 }}
className="bg-black p-4 rounded-full cursor-pointer shadow-xl hover:shadow-[0_0_15px_#fff]"
>

<Icon className="text-white text-2xl" />

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
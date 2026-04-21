import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Calendar, Monitor, Download, FileText, Users,
  CheckSquare, BarChart2, CheckCircle2, Loader2
} from "lucide-react";
import {
  getBillboards, getAllAds, getBookings, getTransactions, getUsers
} from "../../services/adminApi";

const fmt = (n) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency", currency: "PKR", minimumFractionDigits: 0,
  }).format(n || 0);

const REPORT_TYPES = [
  { id: "overview",    label: "Overview",           icon: BarChart2,   color: "#3b82f6" },
  { id: "revenue",     label: "Revenue & Payments", icon: TrendingUp,  color: "#10b981" },
  { id: "bookings",    label: "Bookings",            icon: Calendar,    color: "#8b5cf6" },
  { id: "ads",         label: "Ad Performance",      icon: CheckSquare, color: "#f59e0b" },
  { id: "billboards",  label: "Billboard Activity",  icon: Monitor,     color: "#06b6d4" },
  { id: "advertisers", label: "Advertisers",         icon: Users,       color: "#ec4899" },
];

export default function AdminReports() {
  const [selected, setSelected] = useState("overview");
  const [data, setData] = useState({
    billboards: [], ads: [], bookings: [], payments: [], users: [],
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [bl, ad, bk, tx, us] = await Promise.all([
          getBillboards(), getAllAds(), getBookings(), getTransactions(), getUsers(),
        ]);
        setData({
          billboards: bl.data || [],
          ads: ad.data || [],
          bookings: bk.data || [],
          payments: tx.data || [],
          users: (us.data || []).filter((u) => u.role === "advertiser"),
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const { billboards, ads, bookings, payments, users } = data;

  const totalRevenue = payments
    .filter((p) => ["paid", "completed"].includes(p.status || p.paymentStatus))
    .reduce((s, p) => s + (p.amount || p.totalPrice || 0), 0);

  const pendingRevenue = payments
    .filter((p) => (p.status || p.paymentStatus) === "pending")
    .reduce((s, p) => s + (p.amount || p.totalPrice || 0), 0);

  // ── Real PDF Generator using jsPDF native API ──────────────────────────────
  const generatePDF = async () => {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const now = new Date();
      const reportLabel = REPORT_TYPES.find((r) => r.id === selected)?.label || "Report";

      // ── Color Palette ──────────────────────────────────────────────────────
      const PRIMARY    = [15, 23, 42];    // dark bg
      const ACCENT     = [59, 130, 246];  // blue
      const SUCCESS    = [16, 185, 129];  // emerald
      const WARNING    = [245, 158, 11];  // amber
      const DANGER     = [239, 68, 68];   // red
      const CYAN       = [6, 182, 212];
      const LIGHT_BG   = [241, 245, 249];
      const MUTED      = [100, 116, 139];
      const WHITE      = [255, 255, 255];
      const DARK_TEXT  = [15, 23, 42];
      const HEADER_BG  = [30, 41, 59];

      const addPageHeader = (pageNum) => {
        // Dark header bar
        doc.setFillColor(...HEADER_BG);
        doc.rect(0, 0, W, 28, "F");

        // Blue accent stripe
        doc.setFillColor(...ACCENT);
        doc.rect(0, 0, 6, 28, "F");

        // Logo / title text
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(...WHITE);
        doc.text("CDBMS", 14, 12);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text("Centralized Digital Billboard Management System", 14, 19);

        // Report name
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...WHITE);
        doc.text(`${reportLabel} Report`, W - 14, 12, { align: "right" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Generated: ${now.toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" })}  ${now.toLocaleTimeString()}`, W - 14, 19, { align: "right" });
      };

      const addPageFooter = (pageNum, totalPages) => {
        doc.setFillColor(...LIGHT_BG);
        doc.rect(0, H - 12, W, 12, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text("CDBMS © 2026 — Confidential Platform Report", 14, H - 4.5);
        doc.text(`Page ${pageNum} of ${totalPages}`, W - 14, H - 4.5, { align: "right" });
      };

      const sectionTitle = (doc, y, text, color = ACCENT) => {
        doc.setFillColor(...color);
        doc.rect(14, y, 3, 7, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(...DARK_TEXT);
        doc.text(text, 20, y + 5.5);
        return y + 13;
      };

      const statBox = (doc, x, y, w, label, value, color = ACCENT) => {
        doc.setFillColor(...LIGHT_BG);
        doc.roundedRect(x, y, w, 22, 2, 2, "F");
        doc.setFillColor(...color);
        doc.rect(x, y, 3, 22, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text(label.toUpperCase(), x + 7, y + 7);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(...DARK_TEXT);
        doc.text(String(value), x + 7, y + 17);
      };

      // ─────────────────────────────────────────────────────────────────────
      // PAGE 1 — Cover & KPI Summary (always included)
      // ─────────────────────────────────────────────────────────────────────
      addPageHeader(1);

      // Decorative cover band
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 29, W, H - 40, "F");

      let y = 42;

      // Title block
      doc.setFillColor(...ACCENT);
      doc.roundedRect(14, y, W - 28, 26, 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...WHITE);
      doc.text(`${reportLabel} Report`, W / 2, y + 11, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(219, 234, 254);
      doc.text(`Platform Analytics  ·  ${now.toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`, W / 2, y + 20, { align: "center" });

      y += 36;

      // KPI Summary boxes
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...MUTED);
      doc.text("PLATFORM SNAPSHOT", 14, y);
      y += 6;

      const boxW = (W - 28 - 15) / 4;
      statBox(doc, 14,             y, boxW, "Total Revenue",    fmt(totalRevenue),     SUCCESS);
      statBox(doc, 14 + boxW + 5,  y, boxW, "Total Bookings",   bookings.length,       [139, 92, 246]);
      statBox(doc, 14 + (boxW+5)*2,y, boxW, "Ad Submissions",   ads.length,            WARNING);
      statBox(doc, 14 + (boxW+5)*3,y, boxW, "Active Billboards",billboards.filter(b=>b.status==="active").length, CYAN);

      y += 32;
      statBox(doc, 14,             y, boxW, "Advertisers",      users.length,          [236, 72, 153]);
      statBox(doc, 14 + boxW + 5,  y, boxW, "Approved Ads",     ads.filter(a=>a.approvalStatus==="approved").length, SUCCESS);
      statBox(doc, 14 + (boxW+5)*2,y, boxW, "Pending Revenue",  fmt(pendingRevenue),   WARNING);
      statBox(doc, 14 + (boxW+5)*3,y, boxW, "Confirmed Slots",  bookings.filter(b=>b.status==="confirmed").length, ACCENT);

      y += 35;

      // Ad Status Breakdown horizontal chart
      y = sectionTitle(doc, y, "Ad Approval Breakdown");
      const total = Math.max(ads.length, 1);
      const approved = ads.filter(a => a.approvalStatus === "approved").length;
      const pending  = ads.filter(a => a.approvalStatus === "pending").length;
      const rejected = ads.filter(a => a.approvalStatus === "rejected").length;
      const barW = W - 28;
      const barH = 10;

      // Stacked bar
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(14, y, barW, barH, 2, 2, "F");

      let barX = 14;
      if (approved > 0) { const w = (approved / total) * barW; doc.setFillColor(...SUCCESS); doc.rect(barX, y, w, barH, "F"); barX += w; }
      if (pending > 0)  { const w = (pending  / total) * barW; doc.setFillColor(...WARNING); doc.rect(barX, y, w, barH, "F"); barX += w; }
      if (rejected > 0) { const w = (rejected / total) * barW; doc.setFillColor(...DANGER);  doc.rect(barX, y, w, barH, "F"); }

      y += barH + 5;
      doc.setFontSize(8);
      [
        { label: `Approved: ${approved}`, color: SUCCESS },
        { label: `Pending: ${pending}`,   color: WARNING },
        { label: `Rejected: ${rejected}`, color: DANGER  },
      ].forEach((item, i) => {
        doc.setFillColor(...item.color);
        doc.rect(14 + i * 55, y, 4, 4, "F");
        doc.setTextColor(...DARK_TEXT);
        doc.text(item.label, 21 + i * 55, y + 3.5);
      });

      y += 14;

      // Booking Status breakdown
      if (bookings.length > 0) {
        y = sectionTitle(doc, y, "Booking Status Summary");
        const statuses = ["pending", "confirmed", "completed", "cancelled"];
        const statusColors = { pending: WARNING, confirmed: SUCCESS, completed: ACCENT, cancelled: DANGER };
        const cols = 4;
        const cellW = (W - 28) / cols;
        statuses.forEach((s, i) => {
          const count = bookings.filter(b => b.status === s).length;
          statBox(doc, 14 + i * cellW, y, cellW - 4, s.charAt(0).toUpperCase() + s.slice(1), count, statusColors[s]);
        });
        y += 30;
      }

      // Footer page 1 — will fix total pages after last page
      addPageFooter(1, "?");

      // ─────────────────────────────────────────────────────────────────────
      // Generate data tables per selected report type
      // ─────────────────────────────────────────────────────────────────────
      const tableDefaults = {
        startY: 38,
        margin: { top: 32, left: 14, right: 14, bottom: 18 },
        styles: {
          font: "helvetica",
          fontSize: 8,
          cellPadding: 4,
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: HEADER_BG,
          textColor: WHITE,
          fontStyle: "bold",
          fontSize: 8,
          cellPadding: 5,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        tableLineColor: [226, 232, 240],
        tableLineWidth: 0.1,
        didDrawPage: (hookData) => {
          addPageHeader(hookData.pageNumber);
          addPageFooter(hookData.pageNumber, "?");
        },
      };

      // ── Revenue Table ──────────────────────────────────────────────────
      if (selected === "revenue" || selected === "overview") {
        doc.addPage();
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 28, W, H - 40, "F");

        autoTable(doc, {
          ...tableDefaults,
          head: [["#", "Transaction ID", "Advertiser", "Description", "Amount (PKR)", "Status", "Date"]],
          body: payments.length === 0
            ? [["—", "No transactions recorded", "", "", "", "", ""]]
            : payments.map((p, i) => [
                i + 1,
                (p.transactionId || p._id || "").slice(-10),
                p.advertiser?.name || "Unknown",
                p.description || p.billboard?.name || "Booking Payment",
                (p.amount || p.totalPrice || 0).toLocaleString(),
                (p.status || p.paymentStatus || "unknown").toUpperCase(),
                new Date(p.createdAt).toLocaleDateString(),
              ]),
          columnStyles: {
            0: { cellWidth: 8,  halign: "center" },
            4: { halign: "right", fontStyle: "bold", textColor: SUCCESS },
            5: { halign: "center", fontStyle: "bold" },
          },
          didParseCell: (data) => {
            if (data.column.index === 5 && data.section === "body") {
              const v = String(data.cell.raw).toLowerCase();
              data.cell.styles.textColor =
                v === "paid" || v === "completed" ? SUCCESS :
                v === "pending" ? WARNING : DANGER;
            }
          },
        });
      }

      // ── Bookings Table ──────────────────────────────────────────────────
      if (selected === "bookings" || selected === "overview") {
        doc.addPage();
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 28, W, H - 40, "F");

        autoTable(doc, {
          ...tableDefaults,
          head: [["#", "Advertiser", "Billboard", "City", "Time Slot", "Amount (PKR)", "Status", "Payment"]],
          body: bookings.length === 0
            ? [["—", "No bookings recorded", "", "", "", "", "", ""]]
            : bookings.map((b, i) => [
                i + 1,
                b.advertiser?.name || "Unknown",
                b.billboard?.name || "Deleted Billboard",
                b.billboard?.city || "N/A",
                b.timeSlot || "Full Day",
                (b.totalPrice || 0).toLocaleString(),
                (b.status || "").toUpperCase(),
                (b.paymentStatus || "unknown").toUpperCase(),
              ]),
          columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            5: { halign: "right", fontStyle: "bold", textColor: SUCCESS },
            6: { halign: "center" },
            7: { halign: "center" },
          },
          didParseCell: (data) => {
            if (data.section === "body") {
              if (data.column.index === 6) {
                const v = String(data.cell.raw).toLowerCase();
                data.cell.styles.textColor =
                  v === "confirmed" || v === "completed" ? SUCCESS :
                  v === "pending" ? WARNING : DANGER;
              }
              if (data.column.index === 7) {
                data.cell.styles.textColor =
                  String(data.cell.raw).toLowerCase() === "paid" ? SUCCESS : WARNING;
              }
            }
          },
        });
      }

      // ── Ads Table ──────────────────────────────────────────────────────
      if (selected === "ads" || selected === "overview") {
        doc.addPage();
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 28, W, H - 40, "F");

        autoTable(doc, {
          ...tableDefaults,
          head: [["#", "Ad Title", "Campaign", "Advertiser", "Media Type", "Status", "Submitted"]],
          body: ads.length === 0
            ? [["—", "No ads submitted", "", "", "", "", ""]]
            : ads.map((a, i) => [
                i + 1,
                a.title || "Untitled",
                a.campaign || "—",
                a.advertiser?.name || "Unknown",
                (a.mediaType || "image").toUpperCase(),
                (a.approvalStatus || "pending").toUpperCase(),
                new Date(a.createdAt).toLocaleDateString(),
              ]),
          columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            5: { halign: "center", fontStyle: "bold" },
          },
          didParseCell: (data) => {
            if (data.column.index === 5 && data.section === "body") {
              const v = String(data.cell.raw).toLowerCase();
              data.cell.styles.textColor =
                v === "approved" ? SUCCESS :
                v === "rejected" ? DANGER : WARNING;
            }
          },
        });
      }

      // ── Billboards Table ───────────────────────────────────────────────
      if (selected === "billboards" || selected === "overview") {
        doc.addPage();
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 28, W, H - 40, "F");

        autoTable(doc, {
          ...tableDefaults,
          head: [["#", "Billboard Name", "City", "Location", "Type", "Size", "Resolution", "Rate (PKR/hr)", "Status"]],
          body: billboards.length === 0
            ? [["—", "No billboards registered", "", "", "", "", "", "", ""]]
            : billboards.map((b, i) => [
                i + 1,
                b.name,
                b.city,
                b.location,
                b.type || "Digital LED",
                b.size || "—",
                b.resolution || "—",
                (b.pricePerHour || 0).toLocaleString(),
                (b.status || "").toUpperCase(),
              ]),
          columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            7: { halign: "right", fontStyle: "bold" },
            8: { halign: "center", fontStyle: "bold" },
          },
          didParseCell: (data) => {
            if (data.column.index === 8 && data.section === "body") {
              data.cell.styles.textColor =
                String(data.cell.raw).toLowerCase() === "active" ? SUCCESS : DANGER;
            }
          },
        });
      }

      // ── Advertisers Table ──────────────────────────────────────────────
      if (selected === "advertisers" || selected === "overview") {
        doc.addPage();
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 28, W, H - 40, "F");

        autoTable(doc, {
          ...tableDefaults,
          head: [["#", "Advertiser Name", "Email", "Joined", "Total Ads", "Total Bookings", "Total Spent (PKR)"]],
          body: users.length === 0
            ? [["—", "No advertisers registered", "", "", "", "", ""]]
            : users.map((u, i) => {
                const userAds = ads.filter(a => a.advertiser?._id === u._id || a.advertiserId === u._id).length;
                const userBookings = bookings.filter(b => b.advertiser?._id === u._id).length;
                const userSpent = payments
                  .filter(p => p.advertiser?._id === u._id || p.userId === u._id)
                  .filter(p => ["paid","completed"].includes(p.status||p.paymentStatus))
                  .reduce((s, p) => s + (p.amount || p.totalPrice || 0), 0);
                return [
                  i + 1,
                  u.name,
                  u.email,
                  new Date(u.createdAt).toLocaleDateString(),
                  userAds,
                  userBookings,
                  userSpent.toLocaleString(),
                ];
              }),
          columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            4: { halign: "center" },
            5: { halign: "center" },
            6: { halign: "right", fontStyle: "bold", textColor: SUCCESS },
          },
        });
      }

      // ── Fix page numbers now we know total pages ─────────────────────────
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        // Whiteout old footer text
        doc.setFillColor(241, 245, 249);
        doc.rect(W - 50, H - 12, 50, 12, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(`Page ${p} of ${totalPages}`, W - 14, H - 4.5, { align: "right" });
      }

      const fileName = `CDBMS_${reportLabel.replace(/\s+/g, "_")}_${now.toISOString().slice(0,10)}.pdf`;
      doc.save(fileName);

      setGenerated(true);
      setTimeout(() => setGenerated(false), 3000);
    } catch (err) {
      console.error("PDF error:", err);
      alert(`PDF generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // ── UI rendering ──────────────────────────────────────────────────────────
  const totalRevenuePaid = totalRevenue;
  const approvedAds = ads.filter(a => a.approvalStatus === "approved").length;
  const pendingAds  = ads.filter(a => a.approvalStatus === "pending").length;
  const activeBillboards = billboards.filter(b => b.status === "active").length;
  const activeBookings   = bookings.filter(b => b.status === "confirmed").length;

  const renderTable = () => {
    const thCls = "px-4 py-3 text-[10px] font-black text-blue-200/40 uppercase tracking-widest text-left";
    const tdCls = "px-4 py-3 text-sm text-blue-100/70";
    const trCls = "border-b border-white/5 hover:bg-white/5 transition-colors";

    switch (selected) {
      case "overview":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#131A2A]/60 border border-white/5 rounded-2xl p-5">
              <p className="text-xs font-black text-blue-200/40 uppercase tracking-widest mb-4">Ad Approvals</p>
              {[["Approved", approvedAds, "text-emerald-400"], ["Pending", pendingAds, "text-amber-400"], ["Rejected", ads.filter(a=>a.approvalStatus==="rejected").length, "text-red-400"]].map(([l, v, c]) => (
                <div key={l} className="flex justify-between items-center mb-3">
                  <span className="text-sm text-white">{l}</span>
                  <span className={`text-xl font-black ${c}`}>{v}</span>
                </div>
              ))}
            </div>
            <div className="bg-[#131A2A]/60 border border-white/5 rounded-2xl p-5">
              <p className="text-xs font-black text-blue-200/40 uppercase tracking-widest mb-4">Booking Status</p>
              {["pending","confirmed","completed","cancelled"].map(s => (
                <div key={s} className="flex justify-between items-center mb-3">
                  <span className="text-sm text-white capitalize">{s}</span>
                  <span className="text-xl font-black text-white">{bookings.filter(b=>b.status===s).length}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "revenue":
        return (
          <table className="w-full">
            <thead><tr className="border-b border-white/10"><th className={thCls}>#</th><th className={thCls}>Transaction ID</th><th className={thCls}>Advertiser</th><th className={thCls}>Amount</th><th className={thCls}>Status</th><th className={thCls}>Date</th></tr></thead>
            <tbody>
              {payments.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-blue-200/30">No transactions yet</td></tr>
              : payments.map((p, i) => (
                <tr key={p._id} className={trCls}>
                  <td className={tdCls}>{i+1}</td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-200/50">{(p.transactionId||p._id||"").slice(-10)}</td>
                  <td className={tdCls}>{p.advertiser?.name||"Unknown"}</td>
                  <td className="px-4 py-3 text-cyan-400 font-bold">{fmt(p.amount||p.totalPrice)}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${(p.status||p.paymentStatus)==="paid"?"bg-emerald-500/10 text-emerald-400 border-emerald-500/20":"bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>{p.status||p.paymentStatus}</span></td>
                  <td className={tdCls}>{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "bookings":
        return (
          <table className="w-full">
            <thead><tr className="border-b border-white/10"><th className={thCls}>#</th><th className={thCls}>Advertiser</th><th className={thCls}>Billboard</th><th className={thCls}>Slot</th><th className={thCls}>Amount</th><th className={thCls}>Status</th></tr></thead>
            <tbody>
              {bookings.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-blue-200/30">No bookings yet</td></tr>
              : bookings.map((b, i) => (
                <tr key={b._id} className={trCls}>
                  <td className={tdCls}>{i+1}</td>
                  <td className={tdCls}>{b.advertiser?.name||"Unknown"}</td>
                  <td className={tdCls}>{b.billboard?.name||"Deleted"} <span className="block text-xs text-blue-200/30">{b.billboard?.city}</span></td>
                  <td className="px-4 py-3 text-purple-400 text-xs font-medium">{b.timeSlot||"Full Day"}</td>
                  <td className="px-4 py-3 text-cyan-400 font-bold">{fmt(b.totalPrice)}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${b.status==="confirmed"?"bg-emerald-500/10 text-emerald-400 border-emerald-500/20":b.status==="pending"?"bg-amber-500/10 text-amber-400 border-amber-500/20":"bg-red-500/10 text-red-400 border-red-500/20"}`}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "ads":
        return (
          <table className="w-full">
            <thead><tr className="border-b border-white/10"><th className={thCls}>#</th><th className={thCls}>Title</th><th className={thCls}>Advertiser</th><th className={thCls}>Media</th><th className={thCls}>Status</th><th className={thCls}>Date</th></tr></thead>
            <tbody>
              {ads.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-blue-200/30">No ads yet</td></tr>
              : ads.map((a, i) => (
                <tr key={a._id} className={trCls}>
                  <td className={tdCls}>{i+1}</td>
                  <td className={tdCls}>{a.title||"Untitled"}</td>
                  <td className={tdCls}>{a.advertiser?.name||"Unknown"}</td>
                  <td className="px-4 py-3 text-xs text-blue-200/50 uppercase font-bold">{a.mediaType||"image"}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${a.approvalStatus==="approved"?"bg-emerald-500/10 text-emerald-400 border-emerald-500/20":a.approvalStatus==="rejected"?"bg-red-500/10 text-red-400 border-red-500/20":"bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>{a.approvalStatus}</span></td>
                  <td className={tdCls}>{new Date(a.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "billboards":
        return (
          <table className="w-full">
            <thead><tr className="border-b border-white/10"><th className={thCls}>#</th><th className={thCls}>Name</th><th className={thCls}>City</th><th className={thCls}>Type</th><th className={thCls}>Rate/hr</th><th className={thCls}>Available Slots</th><th className={thCls}>Status</th></tr></thead>
            <tbody>
              {billboards.length === 0 ? <tr><td colSpan={7} className="py-10 text-center text-blue-200/30">No billboards yet</td></tr>
              : billboards.map((b, i) => (
                <tr key={b._id} className={trCls}>
                  <td className={tdCls}>{i+1}</td>
                  <td className={tdCls}>{b.name}</td>
                  <td className={tdCls}>{b.city}</td>
                  <td className="px-4 py-3 text-xs text-blue-200/50 uppercase">{b.type}</td>
                  <td className="px-4 py-3 text-cyan-400 font-bold">{(b.pricePerHour||0).toLocaleString()}</td>
                  <td className={tdCls}>{b.timeSlots?.length||0} slots</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${b.status==="active"?"bg-emerald-500/10 text-emerald-400 border-emerald-500/20":"bg-red-500/10 text-red-400 border-red-500/20"}`}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "advertisers":
        return (
          <table className="w-full">
            <thead><tr className="border-b border-white/10"><th className={thCls}>#</th><th className={thCls}>Name</th><th className={thCls}>Email</th><th className={thCls}>Joined</th><th className={thCls}>Ads</th><th className={thCls}>Bookings</th></tr></thead>
            <tbody>
              {users.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-blue-200/30">No advertisers yet</td></tr>
              : users.map((u, i) => (
                <tr key={u._id} className={trCls}>
                  <td className={tdCls}>{i+1}</td>
                  <td className={tdCls}><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-black text-xs">{(u.name||"?")[0].toUpperCase()}</div>{u.name}</div></td>
                  <td className="px-4 py-3 text-xs text-blue-200/50">{u.email}</td>
                  <td className={tdCls}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-amber-400 font-bold text-center">{ads.filter(a=>a.advertiser?._id===u._id).length}</td>
                  <td className="px-4 py-3 text-purple-400 font-bold text-center">{bookings.filter(b=>b.advertiser?._id===u._id).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-6 bg-darkBg text-textMain relative pb-16 min-h-screen">
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute w-[600px] h-[600px] bg-lime-600 opacity-5 blur-[150px] top-0 right-0 rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-black text-white flex items-center gap-3">
              <FileText className="text-lime-500" /> Analytics & Reports
            </h1>
            <p className="text-blue-100/60 mt-1">
              Live data from database · {new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={generatePDF}
            disabled={generating || loading}
            className={`flex items-center gap-2.5 font-bold px-6 py-3 rounded-xl transition-all disabled:opacity-60 ${generated ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400" : "bg-lime-500/20 hover:bg-lime-500/30 border border-lime-500/30 text-lime-400 shadow-[0_0_20px_rgba(132,204,22,0.1)]"}`}
          >
            {generating ? <Loader2 size={18} className="animate-spin" /> : generated ? <CheckCircle2 size={18} /> : <Download size={18} />}
            {generating ? "Building PDF..." : generated ? "Downloaded!" : "Download PDF Report"}
          </motion.button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {REPORT_TYPES.map((r) => {
            const Icon = r.icon;
            const isActive = selected === r.id;
            return (
              <button key={r.id} onClick={() => setSelected(r.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${isActive ? "text-white" : "text-blue-200/50 border-transparent hover:bg-white/5 hover:text-white"}`}
                style={isActive ? { backgroundColor: r.color + "20", borderColor: r.color + "40" } : {}}>
                <Icon size={16} style={isActive ? { color: r.color } : {}} />
                {r.label}
              </button>
            );
          })}
        </div>

        {/* KPI Row */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {[
              { label: "Revenue",     value: fmt(totalRevenuePaid), color: "text-emerald-400" },
              { label: "Bookings",    value: bookings.length,        color: "text-purple-400"  },
              { label: "Active Slots",value: activeBookings,         color: "text-blue-400"    },
              { label: "Ads",         value: ads.length,             color: "text-amber-400"   },
              { label: "Billboards",  value: activeBillboards,       color: "text-cyan-400"    },
              { label: "Advertisers", value: users.length,           color: "text-pink-400"    },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#131A2A]/80 border border-white/5 rounded-2xl p-4 text-center">
                <p className="text-[9px] font-black text-blue-200/30 uppercase tracking-widest mb-1">{label}</p>
                <p className={`text-xl font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Data Table */}
        <div className="bg-[#131A2A]/80 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-[#0A0F1C]/40 flex justify-between items-center">
            <p className="text-sm font-bold text-white">{REPORT_TYPES.find(r=>r.id===selected)?.label} Data</p>
            <p className="text-xs text-blue-200/30">PDF includes professional formatting with cover page, KPI charts, and all tables</p>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center h-48 text-lime-400 animate-pulse font-bold">Building Report Data...</div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={selected} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  {renderTable()}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs text-blue-200/30 text-center">
          PDF report includes: cover page · platform KPI summary · approval breakdown bar chart · booking status summary · all selected data tables with professional formatting
        </p>
      </div>
    </div>
  );
}
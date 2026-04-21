import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle,
  Clock3,
  CreditCard,
  ImageIcon,
  Mail,
  MapPin,
  MonitorPlay,
  Phone,
  RefreshCw,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  approveBooking,
  confirmBookingPayment,
  getBookings,
  rejectBooking,
  rejectBookingPayment,
  sendAdToDisplay,
} from "../../services/adminApi";

const MEDIA_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/api$/, "");

const FILTERS = [
  { id: "all", label: "All" },
  { id: "awaiting-review", label: "Awaiting Review" },
  { id: "payment-required", label: "Waiting Payment" },
  { id: "proof-submitted", label: "Proof Submitted" },
  { id: "scheduled", label: "Scheduled" },
  { id: "active", label: "Active" },
  { id: "rejected", label: "Rejected" },
  { id: "cancelled", label: "Cancelled" },
];

function buildMediaUrl(url = "") {
  if (!url) return "";
  return url.startsWith("http") ? url : `${MEDIA_BASE_URL}${url}`;
}

function formatCurrency(value) {
  return `PKR ${Number(value || 0).toLocaleString()}`;
}

function getStage(booking) {
  if (booking.status === "pending") return "awaiting-review";
  if (booking.status === "approved" && booking.paymentStatus === "submitted") return "proof-submitted";
  if (booking.status === "approved") return "payment-required";
  if (booking.status === "scheduled") return "scheduled";
  if (booking.status === "active") return "active";
  if (booking.status === "rejected") return "rejected";
  if (booking.status === "cancelled") return "cancelled";
  return booking.status || "all";
}

function getStatusPill(booking) {
  const stage = getStage(booking);
  if (stage === "active") return "bg-emerald-500/15 text-emerald-300";
  if (stage === "scheduled") return "bg-teal-500/15 text-teal-300";
  if (stage === "proof-submitted") return "bg-amber-500/15 text-amber-300";
  if (stage === "payment-required") return "bg-blue-500/15 text-blue-300";
  if (stage === "rejected") return "bg-red-500/15 text-red-300";
  if (stage === "cancelled") return "bg-slate-500/20 text-slate-300";
  return "bg-violet-500/15 text-violet-300";
}

function getStatusLabel(booking) {
  const stage = getStage(booking);
  if (stage === "awaiting-review") return "Awaiting admin decision";
  if (stage === "payment-required") return "Approved - waiting advertiser payment";
  if (stage === "proof-submitted") return "Proof uploaded - verify now";
  if (stage === "scheduled") return "Scheduled";
  if (stage === "active") return "Live on billboard";
  if (stage === "cancelled") return "Auto-cancelled";
  return "Rejected";
}

function getMethodLabel(method) {
  if (method === "easypaisa") return "Easypaisa";
  if (method === "jazzcash") return "JazzCash";
  return "Bank Transfer";
}

function formatCountdown(targetDate) {
  if (!targetDate) return "Not set";
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m left`;
  return `${hours}h ${minutes}m left`;
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("awaiting-review");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [approvalWindows, setApprovalWindows] = useState({});
  const [notes, setNotes] = useState({});
  const [actionBookingId, setActionBookingId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await getBookings();
      const list = Array.isArray(res.data) ? res.data : [];
      setBookings(list);
      setApprovalWindows((current) => {
        const next = { ...current };
        list.forEach((booking) => {
          if (!next[booking._id]) {
            next[booking._id] = booking.gatewayMeta?.manualPayment?.paymentWindowHours || 6;
          }
        });
        return next;
      });
    } catch (error) {
      setActionError(error.response?.data?.message || "Could not load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => filter === "all" || getStage(booking) === filter);
  }, [bookings, filter]);

  const setWindowHours = (bookingId, value) => {
    setApprovalWindows((current) => ({
      ...current,
      [bookingId]: value,
    }));
  };

  const setBookingNote = (bookingId, value) => {
    setNotes((current) => ({
      ...current,
      [bookingId]: value,
    }));
  };

  const performAction = async (bookingId, handler, successMessage) => {
    setActionBookingId(bookingId);
    setActionMessage("");
    setActionError("");

    try {
      await handler();
      setActionMessage(successMessage);
      await load();
    } catch (error) {
      setActionError(error.response?.data?.message || "Action failed.");
    } finally {
      setActionBookingId("");
    }
  };

  const handleApprove = async (bookingId) => {
    await performAction(
      bookingId,
      () =>
        approveBooking(bookingId, {
          paymentWindowHours: Number(approvalWindows[bookingId] || 6),
          note: notes[bookingId] || "",
        }),
      `Booking approved. The advertiser can now pay and upload proof within ${approvalWindows[bookingId] || 6} hours.`
    );
  };

  const handleRejectBooking = async (bookingId) => {
    await performAction(
      bookingId,
      () => rejectBooking(bookingId, { note: notes[bookingId] || "" }),
      "Booking rejected successfully."
    );
  };

  const handleConfirmPayment = async (bookingId) => {
    await performAction(
      bookingId,
      () => confirmBookingPayment(bookingId, { note: notes[bookingId] || "" }),
      "Payment verified. Booking moved to the scheduled section."
    );
  };

  const handleRejectPayment = async (bookingId) => {
    await performAction(
      bookingId,
      () => rejectBookingPayment(bookingId, { note: notes[bookingId] || "" }),
      "Payment proof rejected. Advertiser can submit a new screenshot before expiry."
    );
  };

  const handleDisplayNow = async (bookingId) => {
    await performAction(
      bookingId,
      () => sendAdToDisplay({ bookingId }),
      "Scheduled booking was pushed to the billboard display."
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Booking Review Queue</h1>
          <p className="mt-2 text-sm text-blue-100/60">
            Approve requests first, set the payment timer, review the uploaded screenshot, and schedule the booking only after payment verification.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.2em] transition ${
                filter === item.id
                  ? "bg-sky-500 text-white"
                  : "bg-white/5 text-blue-100/55 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-blue-100/55 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
          {actionMessage}
        </div>
      )}
      {actionError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-white/5 bg-[#131A2A]/70 p-16 text-center text-white/60">
          Loading bookings...
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-3xl border border-white/5 bg-[#131A2A]/70 p-16 text-center">
          <p className="text-xl font-black text-white">No matching booking requests</p>
          <p className="mt-2 text-sm text-blue-100/50">New advertiser requests and payment proofs will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredBookings.map((booking) => {
            const stage = getStage(booking);
            const adMediaUrl = buildMediaUrl(booking.ad?.mediaUrl);
            const billboardImageUrl = buildMediaUrl(booking.billboard?.imageUrl);
            const paymentProofUrl = buildMediaUrl(booking.paymentProof);
            const isReviewable = stage === "awaiting-review";
            const isProofSubmitted = stage === "proof-submitted";
            const isDisplayable = (stage === "scheduled" || stage === "active") && booking.paymentStatus === "paid";

            return (
              <div
                key={booking._id}
                className="rounded-3xl border border-white/5 bg-[#131A2A]/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-black text-white">{booking.billboard?.name || "Unknown billboard"}</h2>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] ${getStatusPill(booking)}`}>
                        {getStatusLabel(booking)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-blue-100/65 md:grid-cols-2 xl:grid-cols-3">
                      <div className="flex items-center gap-2">
                        <MapPin size={15} className="text-sky-400" />
                        {booking.billboard?.city}, {booking.billboard?.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={15} className="text-sky-400" />
                        {new Date(booking.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock3 size={15} className="text-sky-400" />
                        {booking.timeSlot}
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard size={15} className="text-sky-400" />
                        {formatCurrency(booking.totalPrice)} | {booking.durationMinutes || 0} mins
                      </div>
                      <div className="flex items-center gap-2">
                        <UserRound size={15} className="text-sky-400" />
                        {booking.customerName || booking.advertiser?.name || "Unknown advertiser"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={15} className="text-sky-400" />
                        {booking.customerPhone || booking.advertiser?.phone || "No phone"}
                      </div>
                      <div className="flex items-center gap-2 md:col-span-2 xl:col-span-3">
                        <Mail size={15} className="text-sky-400" />
                        {booking.customerEmail || booking.advertiser?.email || "No email"}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
                      <div className="rounded-2xl border border-white/8 bg-[#0A0F1C]/70 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300/55">Booking Summary</p>
                        <div className="mt-3 space-y-2 text-sm text-blue-100/65">
                          <p>Status: {booking.status}</p>
                          <p>Payment Status: {booking.paymentStatus || "pending"}</p>
                          <p>Payment Method: {getMethodLabel(booking.paymentMethod)}</p>
                          <p>Payment Reference: {booking.gatewayReference || "Not submitted yet"}</p>
                          <p>Timer: {formatCountdown(booking.checkoutExpiresAt)}</p>
                          <p>Total: {formatCurrency(booking.totalPrice)}</p>
                          {booking.adminReviewNote && <p>Admin Note: {booking.adminReviewNote}</p>}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-[#0A0F1C]/70 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300/55">Action Note</p>
                        <textarea
                          value={notes[booking._id] || ""}
                          onChange={(event) => setBookingNote(booking._id, event.target.value)}
                          rows={4}
                          placeholder="Optional message or verification note"
                          className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-blue-100/25 focus:border-sky-500/50"
                        />
                        {isReviewable && (
                          <label className="mt-4 block text-sm text-blue-100/65">
                            Payment Window (hours)
                            <input
                              type="number"
                              min="1"
                              max="168"
                              value={approvalWindows[booking._id] || 6}
                              onChange={(event) => setWindowHours(booking._id, event.target.value)}
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-500/50"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-3">
                      <div className="rounded-2xl border border-white/8 bg-[#0A0F1C]/70 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300/55">Billboard</p>
                        {billboardImageUrl ? (
                          <img src={billboardImageUrl} alt={booking.billboard?.name} className="mt-3 h-44 w-full rounded-2xl object-cover" />
                        ) : (
                          <div className="mt-3 flex h-44 items-center justify-center rounded-2xl bg-white/5 text-white/20">
                            <ImageIcon size={28} />
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-[#0A0F1C]/70 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300/55">Creative</p>
                        {adMediaUrl ? (
                          booking.ad?.mediaType === "video" ? (
                            <video src={adMediaUrl} className="mt-3 h-44 w-full rounded-2xl object-cover" controls muted />
                          ) : (
                            <img src={adMediaUrl} alt={booking.ad?.title} className="mt-3 h-44 w-full rounded-2xl object-cover" />
                          )
                        ) : (
                          <div className="mt-3 flex h-44 items-center justify-center rounded-2xl bg-white/5 text-white/20">
                            <ImageIcon size={28} />
                          </div>
                        )}
                        <div className="mt-3 text-sm text-blue-100/65">
                          <p className="font-bold text-white">{booking.ad?.title || "Untitled creative"}</p>
                          <p className="mt-1">{booking.ad?.description || "No description provided."}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-[#0A0F1C]/70 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300/55">Payment Proof</p>
                        {paymentProofUrl ? (
                          <img src={paymentProofUrl} alt="Payment proof" className="mt-3 h-44 w-full rounded-2xl object-cover" />
                        ) : (
                          <div className="mt-3 flex h-44 items-center justify-center rounded-2xl bg-white/5 text-white/20">
                            <ImageIcon size={28} />
                          </div>
                        )}
                        <div className="mt-3 text-sm text-blue-100/65">
                          <p>Method: {getMethodLabel(booking.paymentMethod)}</p>
                          <p>Booking Ref: {booking.gatewayReference || booking.gatewayMeta?.manualPayment?.paymentReference || "Not issued yet"}</p>
                          <p>Easypaisa Txn: {booking.gatewayTransactionId || booking.gatewayMeta?.manualPayment?.customerTransactionId || "Not submitted yet"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 xl:w-[260px] xl:flex-col">
                    {isReviewable && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(booking._id)}
                          disabled={actionBookingId === booking._id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                        >
                          <CheckCircle size={16} /> Approve with Timer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectBooking(booking._id)}
                          disabled={actionBookingId === booking._id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-black text-white hover:bg-red-400 disabled:opacity-60"
                        >
                          <XCircle size={16} /> Reject Request
                        </button>
                      </>
                    )}

                    {stage === "payment-required" && (
                      <button
                        type="button"
                        onClick={() => handleRejectBooking(booking._id)}
                        disabled={actionBookingId === booking._id}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-black text-white hover:bg-red-400 disabled:opacity-60"
                      >
                        <XCircle size={16} /> Cancel Request
                      </button>
                    )}

                    {isProofSubmitted && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleConfirmPayment(booking._id)}
                          disabled={actionBookingId === booking._id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                        >
                          <CheckCircle size={16} /> Confirm Payment
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectPayment(booking._id)}
                          disabled={actionBookingId === booking._id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-60"
                        >
                          <XCircle size={16} /> Reject Proof
                        </button>
                      </>
                    )}

                    {isDisplayable && (
                      <button
                        type="button"
                        onClick={() => handleDisplayNow(booking._id)}
                        disabled={actionBookingId === booking._id}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-black text-white hover:bg-sky-400 disabled:opacity-60"
                      >
                        <MonitorPlay size={16} /> Display Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

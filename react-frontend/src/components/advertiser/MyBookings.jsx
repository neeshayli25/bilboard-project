import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  ImageIcon,
  LoaderCircle,
  MapPin,
  MonitorPlay,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { displayMyBooking, getMyBookings, submitManualPayment } from "../../api";

const MEDIA_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/api$/, "");

const FILTERS = [
  { id: "all", label: "All Requests" },
  { id: "pending_review", label: "Awaiting Admin" },
  { id: "payment_required", label: "Pay to Confirm" },
  { id: "awaiting_verification", label: "Proof Sent" },
  { id: "scheduled", label: "Scheduled" },
  { id: "rejected", label: "Rejected" },
  { id: "cancelled", label: "Cancelled" },
];

const emptyForm = {
  paymentMethod: "",
  transactionId: "",
  senderAccount: "",
  notes: "",
  paymentProof: null,
};

function buildMediaUrl(url = "") {
  if (!url) return "";
  return url.startsWith("http") ? url : `${MEDIA_BASE_URL}${url}`;
}

function formatCurrency(value) {
  return `PKR ${Number(value || 0).toLocaleString()}`;
}

function getBookingStage(booking) {
  if (booking.status === "rejected") return "rejected";
  if (booking.status === "cancelled") return "cancelled";
  if (["scheduled", "active", "completed"].includes(booking.status)) return "scheduled";
  if (booking.status === "approved" && booking.paymentStatus === "submitted") return "awaiting_verification";
  if (booking.status === "approved" && booking.paymentStatus !== "paid") return "payment_required";
  if (booking.status === "pending") return "pending_review";
  return "all";
}

function getStatusClasses(booking) {
  const stage = getBookingStage(booking);
  if (stage === "scheduled") return "bg-emerald-100 text-emerald-700";
  if (stage === "payment_required") return "bg-blue-100 text-blue-700";
  if (stage === "awaiting_verification") return "bg-amber-100 text-amber-700";
  if (stage === "rejected") return "bg-red-100 text-red-700";
  if (stage === "cancelled") return "bg-slate-200 text-slate-700";
  return "bg-violet-100 text-violet-700";
}

function getStatusLabel(booking) {
  const stage = getBookingStage(booking);
  if (stage === "scheduled") return booking.status === "active" ? "Live on billboard" : "Scheduled";
  if (stage === "payment_required") return "Approved - pay to confirm";
  if (stage === "awaiting_verification") return "Payment proof under review";
  if (stage === "rejected") return "Rejected";
  if (stage === "cancelled") return "Auto-cancelled";
  return "Awaiting admin review";
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

function getPaymentSnapshot(booking) {
  return booking?.gatewayMeta?.manualPayment?.instructions || {};
}

function getPaymentReference(booking) {
  return (
    booking?.gatewayMeta?.manualPayment?.paymentReference ||
    booking?.gatewayReference ||
    booking?._id ||
    ""
  );
}

function buildPaymentQrPayload(booking) {
  return (
    booking?.gatewayMeta?.manualPayment?.qrPayload ||
    [
      "CDBMS Easypaisa Payment",
      `Reference: ${getPaymentReference(booking)}`,
      `Booking: ${booking?._id || ""}`,
      `Amount: ${formatCurrency(booking?.totalPrice)}`,
      getPaymentSnapshot(booking).easypaisaNumber
        ? `Easypaisa: ${getPaymentSnapshot(booking).easypaisaNumber}`
        : "",
    ]
      .filter(Boolean)
      .join("\n")
  );
}

function buildQrImageUrl(booking) {
  const payload = buildPaymentQrPayload(booking);
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(payload)}`;
}

function getDefaultMethod(booking) {
  const snapshot = getPaymentSnapshot(booking);
  if (snapshot.easypaisaNumber) return "easypaisa";
  if (snapshot.jazzCashNumber) return "jazzcash";
  return "bank_transfer";
}

function MessageCard({ tone = "info", children }) {
  const styles =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}

export default function MyBookings() {
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedBookingId, setExpandedBookingId] = useState("");
  const [formState, setFormState] = useState(emptyForm);
  const [submittingBookingId, setSubmittingBookingId] = useState("");
  const [displayingBookingId, setDisplayingBookingId] = useState("");
  const [copiedReference, setCopiedReference] = useState("");
  const [feedback, setFeedback] = useState({ tone: "info", message: "", bookingId: "" });
  const [now, setNow] = useState(Date.now());

  const loadBookings = async () => {
    setLoading(true);
    try {
      const response = await getMyBookings();
      setBookings(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error.response?.data?.message || "Could not load your bookings right now.",
        bookingId: "",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const linkedBookingId = searchParams.get("booking");
    const linkedAction = searchParams.get("action");
    if (!linkedBookingId || linkedAction !== "pay") return;

    const booking = bookings.find((item) => item._id === linkedBookingId);
    if (!booking || getBookingStage(booking) !== "payment_required") return;

    setExpandedBookingId(booking._id);
    setFormState({
      ...emptyForm,
      paymentMethod: getDefaultMethod(booking),
    });
  }, [bookings, searchParams]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const stage = getBookingStage(booking);
      const matchesFilter = statusFilter === "all" || stage === statusFilter;
      const haystack = [
        booking.billboard?.name || "",
        booking.billboard?.city || "",
        booking.billboard?.location || "",
        booking.ad?.title || "",
      ]
        .join(" ")
        .toLowerCase();

      return matchesFilter && haystack.includes(searchTerm.toLowerCase());
    });
  }, [bookings, searchTerm, statusFilter]);

  const togglePaymentPanel = (booking) => {
    if (expandedBookingId === booking._id) {
      setExpandedBookingId("");
      setFormState(emptyForm);
      return;
    }

    setExpandedBookingId(booking._id);
    setFormState({
      ...emptyForm,
      paymentMethod: getDefaultMethod(booking),
    });
  };

  const handleSubmitPayment = async (booking) => {
    if (!formState.transactionId.trim()) {
      setFeedback({
        tone: "error",
        message: "Enter the Easypaisa transaction/reference ID from your receipt before submitting proof.",
        bookingId: booking._id,
      });
      return;
    }

    if (!formState.paymentProof) {
      setFeedback({
        tone: "error",
        message: "Please attach the payment screenshot first.",
        bookingId: booking._id,
      });
      return;
    }

    const payload = new FormData();
    payload.append("bookingId", booking._id);
    payload.append("paymentMethod", formState.paymentMethod || getDefaultMethod(booking));
    payload.append("transactionId", formState.transactionId);
    payload.append("senderAccount", formState.senderAccount);
    payload.append("notes", formState.notes);
    payload.append("paymentProof", formState.paymentProof);

    setSubmittingBookingId(booking._id);
    setFeedback({ tone: "info", message: "", bookingId: booking._id });

    try {
      const response = await submitManualPayment(payload);
      setFeedback({
        tone: "success",
        message: response.data?.message || "Payment proof submitted successfully.",
        bookingId: booking._id,
      });
      setExpandedBookingId("");
      setFormState(emptyForm);
      await loadBookings();
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error.response?.data?.message || "Could not submit the payment proof.",
        bookingId: booking._id,
      });
    } finally {
      setSubmittingBookingId("");
    }
  };

  const handleCopyReference = async (reference) => {
    if (!reference) return;
    try {
      await navigator.clipboard.writeText(reference);
      setCopiedReference(reference);
      window.setTimeout(() => setCopiedReference(""), 1800);
    } catch {
      setCopiedReference("");
    }
  };

  const handleDisplayNow = async (booking) => {
    setDisplayingBookingId(booking._id);
    setFeedback({ tone: "info", message: "", bookingId: booking._id });

    try {
      const response = await displayMyBooking(booking._id);
      setFeedback({
        tone: "success",
        message: response.data?.message || "The scheduled ad was pushed to the billboard display for demo playback.",
        bookingId: booking._id,
      });
      await loadBookings();
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error.response?.data?.message || "Could not push this booking to the display.",
        bookingId: booking._id,
      });
    } finally {
      setDisplayingBookingId("");
    }
  };

  const renderBanner = (booking) => {
    const stage = getBookingStage(booking);
    const countdown = formatCountdown(booking.checkoutExpiresAt);

    if (stage === "pending_review") {
      return (
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-700">
          <AlertTriangle size={15} />
          Your request is with admin for approval. Payment stays locked until they accept the slot.
        </div>
      );
    }

    if (stage === "payment_required") {
      return (
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-700">
          <ShieldCheck size={15} />
          Approved by admin. Pay and upload the screenshot before the timer ends: {countdown}.
        </div>
      );
    }

    if (stage === "awaiting_verification") {
      return (
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <Clock3 size={15} />
          Payment proof submitted. Admin verification is pending. Time left: {countdown}.
        </div>
      );
    }

    if (stage === "scheduled") {
      return (
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 size={15} />
          Booking is confirmed and moved into the scheduled workflow.
        </div>
      );
    }

    if (stage === "cancelled") {
      return (
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
          <AlertTriangle size={15} />
          Payment window expired. A fresh booking request is required for this slot.
        </div>
      );
    }

    return (
      <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
        <AlertTriangle size={15} />
        This request was rejected by admin.
      </div>
    );
  };

  const renderPaymentPanel = (booking) => {
    const snapshot = getPaymentSnapshot(booking);
    const proofUrl = buildMediaUrl(booking.paymentProof);
    const billboardImage = buildMediaUrl(booking.billboard?.imageUrl);
    const adMediaUrl = buildMediaUrl(booking.ad?.mediaUrl);
    const paymentReference = getPaymentReference(booking);
    const qrImageUrl = buildQrImageUrl(booking);

    return (
      <div className="mt-5 grid gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-500">Payment Instructions</p>
            <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
              <p>
                Merchant: <span className="font-semibold text-slate-900">{snapshot.merchantLabel || "CDBMS Admin"}</span>
              </p>
              <p>
                Account Title: <span className="font-semibold text-slate-900">{snapshot.accountTitle || "Not provided"}</span>
              </p>
              <p>
                Easypaisa: <span className="font-semibold text-slate-900">{snapshot.easypaisaNumber || "Not available"}</span>
              </p>
              <p>
                JazzCash: <span className="font-semibold text-slate-900">{snapshot.jazzCashNumber || "Not available"}</span>
              </p>
              <p className="md:col-span-2">
                Bank: <span className="font-semibold text-slate-900">{snapshot.bankName || "Not provided"}</span>
                {snapshot.bankIban ? ` | ${snapshot.bankIban}` : ""}
              </p>
              <p className="md:col-span-2">
                Instructions: <span className="font-semibold text-slate-900">{snapshot.instructions || "Complete the transfer and upload the screenshot."}</span>
              </p>
              <p>
                Payment Timer: <span className="font-semibold text-slate-900">{formatCountdown(booking.checkoutExpiresAt)}</span>
              </p>
              <p>
                Total: <span className="font-semibold text-slate-900">{formatCurrency(booking.totalPrice)}</span>
              </p>
              <div className="md:col-span-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-500">Booking Payment Reference</p>
                    <p className="mt-1 break-all text-base font-black text-slate-950">{paymentReference}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyReference(paymentReference)}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                  >
                    <Copy size={14} /> {copiedReference === paymentReference ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Include this reference in the Easypaisa note if the app allows it, then enter the Easypaisa transaction ID from your receipt below.
                </p>
              </div>
            </div>
          </div>

          {snapshot.easypaisaNumber && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <img src={qrImageUrl} alt="Easypaisa payment QR" className="h-40 w-40 rounded-xl object-contain" />
                </div>
                <div className="min-w-[220px] flex-1">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">
                    <QrCode size={15} /> Easypaisa QR Helper
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Scan or share this QR to carry the amount, Easypaisa number, and booking reference together. It still needs admin verification against the real Easypaisa transaction history.
                  </p>
                  <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    <span>Number: <strong className="text-slate-950">{snapshot.easypaisaNumber}</strong></span>
                    <span>Amount: <strong className="text-slate-950">{formatCurrency(booking.totalPrice)}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Submit Payment Proof</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-slate-600">
                Payment Method
                <select
                  value={formState.paymentMethod}
                  onChange={(event) => setFormState((current) => ({ ...current, paymentMethod: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-slate-900 outline-none focus:border-blue-400"
                >
                  {snapshot.easypaisaNumber && <option value="easypaisa">Easypaisa</option>}
                  {snapshot.jazzCashNumber && <option value="jazzcash">JazzCash</option>}
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </label>

              <label className="text-sm text-slate-600">
                Transaction / Reference ID
                <input
                  type="text"
                  value={formState.transactionId}
                  onChange={(event) => setFormState((current) => ({ ...current, transactionId: event.target.value }))}
                  placeholder="Required from Easypaisa receipt"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-slate-900 outline-none focus:border-blue-400"
                />
              </label>

              <label className="text-sm text-slate-600">
                Sender Account / Number
                <input
                  type="text"
                  value={formState.senderAccount}
                  onChange={(event) => setFormState((current) => ({ ...current, senderAccount: event.target.value }))}
                  placeholder="03xxxxxxxxx"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-slate-900 outline-none focus:border-blue-400"
                />
              </label>

              <label className="text-sm text-slate-600">
                Screenshot
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      paymentProof: event.target.files?.[0] || null,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                />
              </label>

              <label className="text-sm text-slate-600 md:col-span-2">
                Notes
                <textarea
                  value={formState.notes}
                  onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
                  rows={3}
                  placeholder="Any extra detail for admin verification"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-slate-900 outline-none focus:border-blue-400"
                />
              </label>
            </div>

            {feedback.bookingId === booking._id && feedback.message && (
              <div className="mt-4">
                <MessageCard tone={feedback.tone}>{feedback.message}</MessageCard>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleSubmitPayment(booking)}
              disabled={submittingBookingId === booking._id}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {submittingBookingId === booking._id ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" /> Uploading
                </>
              ) : (
                <>
                  <Upload size={16} /> Submit Payment Proof
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Billboard</p>
            {billboardImage ? (
              <img src={billboardImage} alt={booking.billboard?.name} className="mt-3 h-44 w-full rounded-2xl object-cover" />
            ) : (
              <div className="mt-3 flex h-44 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ImageIcon size={28} />
              </div>
            )}
            <div className="mt-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{booking.billboard?.name}</p>
              <p>{booking.billboard?.city}, {booking.billboard?.location}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Ad Creative</p>
            {adMediaUrl ? (
              booking.ad?.mediaType === "video" ? (
                <video src={adMediaUrl} className="mt-3 h-44 w-full rounded-2xl object-cover" controls muted />
              ) : (
                <img src={adMediaUrl} alt={booking.ad?.title} className="mt-3 h-44 w-full rounded-2xl object-cover" />
              )
            ) : (
              <div className="mt-3 flex h-44 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ImageIcon size={28} />
              </div>
            )}
            <div className="mt-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{booking.ad?.title || "Untitled ad"}</p>
              <p>{booking.ad?.description || "No ad description provided."}</p>
            </div>
          </div>

          {proofUrl && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Latest Submitted Proof</p>
              <img src={proofUrl} alt="Payment proof" className="mt-3 h-44 w-full rounded-2xl object-cover" />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-slate-500">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Bookings</h1>
          <p className="mt-1 text-slate-500">
            Create the booking request first, wait for admin approval, then pay manually and upload the screenshot to confirm the slot.
          </p>
        </div>
        <button
          type="button"
          onClick={loadBookings}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-600"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {feedback.message && !feedback.bookingId && (
        <div className="mb-5">
          <MessageCard tone={feedback.tone}>{feedback.message}</MessageCard>
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[220px] flex-1">
            <input
              type="text"
              placeholder="Search by billboard, city, location, or ad..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
          >
            {FILTERS.map((filter) => (
              <option key={filter.id} value={filter.id}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-14 text-center">
          <Calendar size={46} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-600">You have not created any booking requests yet.</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-14 text-center text-slate-600">
          No bookings match your current filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const stage = getBookingStage(booking);
            const isExpanded = expandedBookingId === booking._id;
            const isPayable = stage === "payment_required";
            const canDisplayDemo = stage === "scheduled" || booking.status === "active";
            const isLinkedBooking = searchParams.get("booking") === booking._id;

            return (
              <div
                key={booking._id}
                className={`rounded-2xl border bg-white p-5 shadow-sm ${
                  isLinkedBooking ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">{booking.billboard?.name || "Unknown billboard"}</h2>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(booking)}`}>
                        {getStatusLabel(booking)}
                      </span>
                    </div>

                    <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-3">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-blue-500" />
                        {new Date(booking.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock3 size={14} className="text-blue-500" />
                        {booking.timeSlot}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-blue-500" />
                        {booking.billboard?.city}, {booking.billboard?.location}
                      </div>
                      <div>
                        Duration: <span className="font-semibold text-slate-900">{booking.durationMinutes || 0} mins</span>
                      </div>
                      <div>
                        Method: <span className="font-semibold text-slate-900">{getMethodLabel(booking.paymentMethod)}</span>
                      </div>
                      <div>
                        Total: <span className="font-semibold text-blue-700">{formatCurrency(booking.totalPrice)}</span>
                      </div>
                    </div>

                    {renderBanner(booking)}

                    {booking.adminReviewNote && (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        {booking.adminReviewNote}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {isPayable && (
                      <button
                        type="button"
                        onClick={() => togglePaymentPanel(booking)}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        <CreditCard size={16} />
                        {isExpanded ? "Hide Payment" : "Pay to Confirm"}
                      </button>
                    )}
                    {canDisplayDemo && (
                      <button
                        type="button"
                        onClick={() => handleDisplayNow(booking)}
                        disabled={displayingBookingId === booking._id}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                      >
                        {displayingBookingId === booking._id ? (
                          <>
                            <LoaderCircle size={16} className="animate-spin" /> Sending
                          </>
                        ) : (
                          <>
                            <MonitorPlay size={16} /> Display for Demo
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && isPayable && renderPaymentPanel(booking)}

                {(!isPayable || !isExpanded) && feedback.bookingId === booking._id && feedback.message && (
                  <div className="mt-4">
                    <MessageCard tone={feedback.tone}>{feedback.message}</MessageCard>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

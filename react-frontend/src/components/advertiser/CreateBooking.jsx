import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ImagePlus,
  Mail,
  MapPin,
  Phone,
  Upload,
  UserRound,
} from "lucide-react";
import {
  createBooking,
  getBillboardAvailability,
  uploadAd,
} from "../../services/adminApi";
import { buildMediaUrl } from "../../utils/media";

const BOOKING_CONTEXT_KEY = "cdbms_booking_request_context";
const createEmptyAvailability = () => ({
  configuredSlots: [],
  availableSlots: [],
  bookedSlots: [],
  occupiedSlots: [],
  statusMessage: "",
  isFullyBooked: false,
});

function loadStoredContext() {
  try {
    const raw = sessionStorage.getItem(BOOKING_CONTEXT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredContext(value) {
  sessionStorage.setItem(BOOKING_CONTEXT_KEY, JSON.stringify(value));
}

function clearStoredContext() {
  sessionStorage.removeItem(BOOKING_CONTEXT_KEY);
}

function getRequestErrorMessage(error, stageLabel) {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message === "Network Error") {
    return `The app could not reach the server during ${stageLabel}. This usually means the tunnel dropped, the server restarted, or the media upload connection was interrupted.`;
  }
  return error?.message || "Could not complete the request.";
}

function parse24HourToMinutes(timeStr) {
  const [hours = 0, minutes = 0] = String(timeStr || "").split(":").map(Number);
  return hours * 60 + minutes;
}

function format24To12Hour(timeStr) {
  const [rawHours = 0, rawMinutes = 0] = String(timeStr || "").split(":").map(Number);
  const meridiem = rawHours >= 12 ? "PM" : "AM";
  const hours = rawHours % 12 || 12;
  return `${hours}:${String(rawMinutes).padStart(2, "0")} ${meridiem}`;
}

function formatTimeRange(range) {
  const [start = "", end = ""] = String(range || "").split("-");
  if (!start || !end) return range;
  return `${format24To12Hour(start)} - ${format24To12Hour(end)}`;
}

function extractDatePrefix(slot = "") {
  const match = String(slot || "")
    .trim()
    .match(/^(\d{4}-\d{2}-\d{2})\s+/);
  return match ? match[1] : "";
}

function extractWindowBounds(range = "") {
  const [start = "", end = ""] = String(range || "").split("-").map((value) => value.trim());
  return { start, end };
}

function getSlotDurationMinutes(range = "") {
  const { start, end } = extractWindowBounds(range);
  return Math.max(0, parse24HourToMinutes(end) - parse24HourToMinutes(start));
}

function addMinutesToTime(timeStr, minutesToAdd) {
  const baseMinutes = parse24HourToMinutes(timeStr);
  const nextMinutes = baseMinutes + Number(minutesToAdd || 0);
  if (!timeStr || !Number.isFinite(nextMinutes) || nextMinutes < 0 || nextMinutes > 24 * 60) return "";

  const hours = Math.floor(nextMinutes / 60);
  const minutes = nextMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDateCard(dateValue) {
  if (!dateValue) return { weekday: "", label: "", shortLabel: "" };
  const parsed = new Date(`${dateValue}T00:00:00`);
  return {
    weekday: parsed.toLocaleDateString("en-PK", { weekday: "short" }),
    label: parsed.toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" }),
    shortLabel: parsed.toLocaleDateString("en-PK", { month: "short", day: "numeric" }),
  };
}

function buildStartTimeOptions(windowSlot = "", runMinutes = 1) {
  const { start, end } = extractWindowBounds(windowSlot);
  if (!start || !end) return [];

  const startMinutes = parse24HourToMinutes(start);
  const endMinutes = parse24HourToMinutes(end);
  const safeRunMinutes = Math.max(1, Number(runMinutes || 1));
  const lastPossibleStart = endMinutes - safeRunMinutes;

  if (lastPossibleStart < startMinutes) return [];

  const options = [];
  for (let minutes = startMinutes; minutes <= lastPossibleStart; minutes += 1) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    options.push(`${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`);
  }
  return options;
}

function slotContainsRange(containerSlot, startTime, endTime) {
  const [containerStart = 0, containerEnd = 0] = String(containerSlot || "")
    .split("-")
    .map((value) => parse24HourToMinutes(value));
  const startMinutes = parse24HourToMinutes(startTime);
  const endMinutes = parse24HourToMinutes(endTime);
  return startMinutes >= containerStart && endMinutes <= containerEnd;
}

function isValidPakistaniMobile(value = "") {
  return /^03\d{9}$/.test(String(value || "").trim());
}

function getOccupiedWindowTone(slot) {
  if (slot?.status === "active") return "Currently an ad is already running there. Not available.";
  if (slot?.status === "scheduled") return "Another ad is already scheduled there. Not available.";
  if (slot?.status === "approved") return "This slot is reserved and waiting for payment confirmation. Not available.";
  return "Another booking request already exists for this window. Not available.";
}

export default function CreateBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const storedContext = loadStoredContext();

  const [billboard, setBillboard] = useState(location.state?.billboard || storedContext?.billboard || null);
  const [step, setStep] = useState(storedContext?.step || 1);
  const [date, setDate] = useState(storedContext?.date || "");
  const [selectedWindow, setSelectedWindow] = useState(storedContext?.selectedWindow || "");
  const [startTime, setStartTime] = useState(storedContext?.startTime || "");
  const [endTime, setEndTime] = useState(storedContext?.endTime || "");
  const [durationInput, setDurationInput] = useState(storedContext?.durationInput || "");
  const [availability, setAvailability] = useState(() => createEmptyAvailability());
  const [adForm, setAdForm] = useState({
    title: storedContext?.adForm?.title || "",
    description: storedContext?.adForm?.description || "",
    duration: storedContext?.adForm?.duration || "30",
  });
  const [customer, setCustomer] = useState({
    name: storedContext?.customer?.name || sessionStorage.getItem("name") || "",
    email: sessionStorage.getItem("email") || storedContext?.customer?.email || "",
    phone: storedContext?.customer?.phone || "",
  });
  const [mediaFile, setMediaFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(storedContext?.result || null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (location.state?.billboard) {
      setBillboard(location.state.billboard);
    }
  }, [location.state]);

  useEffect(() => {
    if (!billboard) {
      navigate("/advertiser/billboards");
    }
  }, [billboard, navigate]);

  useEffect(() => {
    if (!billboard?._id || !date) {
      setAvailability(createEmptyAvailability());
      return;
    }

    const loadAvailability = async () => {
      try {
        const res = await getBillboardAvailability(billboard._id, date);
        setAvailability({
          configuredSlots: res.data?.configuredSlots || [],
          availableSlots: res.data?.availableSlots || [],
          bookedSlots: res.data?.bookedSlots || [],
          occupiedSlots: res.data?.occupiedSlots || [],
          statusMessage: res.data?.statusMessage || "",
          isFullyBooked: Boolean(res.data?.isFullyBooked),
        });
      } catch (error) {
        setAvailability(createEmptyAvailability());
        setErrorMessage(error.response?.data?.message || "Could not load billboard availability.");
      }
    };

    loadAvailability();
  }, [billboard?._id, date]);

  useEffect(() => {
    if (!selectedWindow) return;
    if (!availability.availableSlots.includes(selectedWindow)) {
      setSelectedWindow("");
      setStartTime("");
      setEndTime("");
      setDurationInput("");
    }
  }, [availability.availableSlots, selectedWindow]);

  useEffect(() => {
    if (!mediaFile) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(mediaFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [mediaFile]);

  useEffect(() => {
    if (!billboard) return;
    if (result) {
      clearStoredContext();
      return;
    }

    saveStoredContext({
      billboard,
      step,
      date,
      selectedWindow,
      startTime,
      endTime,
      durationInput,
      customer,
      adForm,
      result,
    });
  }, [billboard, step, date, selectedWindow, startTime, endTime, durationInput, customer, adForm, result]);

  const availableDateCards = useMemo(() => {
    const grouped = new Map();
    (billboard?.timeSlots || []).forEach((slot) => {
      const datePrefix = extractDatePrefix(slot);
      if (!datePrefix) return;
      grouped.set(datePrefix, (grouped.get(datePrefix) || 0) + 1);
    });

    return Array.from(grouped.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([value, slotCount]) => ({
        value,
        slotCount,
        ...formatDateCard(value),
      }));
  }, [billboard?.timeSlots]);

  const selectedWindowBounds = useMemo(() => extractWindowBounds(selectedWindow), [selectedWindow]);

  const startTimeOptions = useMemo(
    () => buildStartTimeOptions(selectedWindow, Number(durationInput || 1)),
    [durationInput, selectedWindow]
  );

  const maxDurationForCurrentStart = useMemo(() => {
    if (!selectedWindow || !startTime) return 0;
    return Math.max(0, parse24HourToMinutes(selectedWindowBounds.end) - parse24HourToMinutes(startTime));
  }, [selectedWindow, selectedWindowBounds.end, startTime]);

  const quickDurationOptions = useMemo(
    () => [1, 2, 3, 4, 5, 10, 15, 30, 45, 60].filter((minutes) => minutes <= (maxDurationForCurrentStart || getSlotDurationMinutes(selectedWindow))),
    [maxDurationForCurrentStart, selectedWindow]
  );

  useEffect(() => {
    if (!selectedWindow) return;
    const fallbackStart = startTimeOptions[0] || "";

    if (!fallbackStart) {
      setStartTime("");
      setEndTime("");
      return;
    }

    if (!startTime || !startTimeOptions.includes(startTime)) {
      setStartTime(fallbackStart);
    }
  }, [selectedWindow, startTimeOptions, startTime]);

  useEffect(() => {
    if (!selectedWindow || !startTime) {
      setEndTime("");
      return;
    }

    const requestedDuration = Number(durationInput || 0);
    if (!Number.isFinite(requestedDuration) || requestedDuration < 1) {
      setEndTime("");
      return;
    }

    if (!maxDurationForCurrentStart) {
      setEndTime("");
      return;
    }

    if (requestedDuration > maxDurationForCurrentStart) {
      setDurationInput(String(maxDurationForCurrentStart));
      return;
    }

    setEndTime(addMinutesToTime(startTime, requestedDuration));
  }, [durationInput, maxDurationForCurrentStart, selectedWindow, startTime]);

  const pricing = useMemo(() => {
    if (!billboard) return { valid: false, message: "Select a billboard first." };
    if (!date) return { valid: false, message: "Choose the date you want the ad to run." };
    if (!selectedWindow) return { valid: false, message: "Pick one available window card first." };
    if (!startTime || !endTime) return { valid: false, message: "Select the start time and total running minutes." };

    const startMinutes = parse24HourToMinutes(startTime);
    const endMinutes = parse24HourToMinutes(endTime);
    if (endMinutes <= startMinutes) return { valid: false, message: "End time must be later than start time." };
    if (!availability.availableSlots.length) {
      return {
        valid: false,
        message:
          availability.statusMessage ||
          (availability.configuredSlots.length
            ? "No free windows were found for this date."
            : "This billboard has no configured availability on the selected date."),
      };
    }

    if (!availability.availableSlots.includes(selectedWindow)) {
      return { valid: false, message: "That available window is no longer free. Please pick another one." };
    }

    if (!slotContainsRange(selectedWindow, startTime, endTime)) {
      return { valid: false, message: "This slot overlaps with an existing booking. Please choose another time." };
    }

    const durationMinutes = endMinutes - startMinutes;
    if (durationMinutes < 1) {
      return { valid: false, message: "Running time must be at least 1 minute." };
    }

    const ratePerMinute = Number(billboard.pricePerMinute ?? billboard.pricePerHour ?? 0);
    const totalPrice = Number((durationMinutes * ratePerMinute).toFixed(2));

    return {
      valid: true,
      durationMinutes,
      ratePerMinute,
      totalPrice,
      formattedSlot: `${format24To12Hour(startTime)} - ${format24To12Hour(endTime)}`,
      availableWindowLabel: formatTimeRange(selectedWindow),
      formula: `PKR ${ratePerMinute.toFixed(2)} x ${durationMinutes} min = PKR ${totalPrice.toFixed(2)}`,
    };
  }, [availability.availableSlots, availability.configuredSlots.length, availability.statusMessage, billboard, date, endTime, selectedWindow, startTime]);

  const resetSubmissionState = () => {
    setResult(null);
    setErrorMessage("");
  };

  const updateAdField = (key, value) => {
    resetSubmissionState();
    setAdForm((current) => ({ ...current, [key]: value }));
  };

  const updateCustomerField = (key, value) => {
    resetSubmissionState();
    setCustomer((current) => ({ ...current, [key]: value }));
  };

  const handleDateSelection = (nextDate) => {
    resetSubmissionState();
    setDate(nextDate);
    setSelectedWindow("");
    setStartTime("");
    setEndTime("");
    setDurationInput("");
  };

  const handleWindowSelect = (windowSlot) => {
    resetSubmissionState();
    const defaultMinutes = Math.min(5, Math.max(1, getSlotDurationMinutes(windowSlot)));
    const { start } = extractWindowBounds(windowSlot);

    setSelectedWindow(windowSlot);
    setStartTime(start);
    setDurationInput(String(defaultMinutes));
    setEndTime(addMinutesToTime(start, defaultMinutes));
  };

  const handleStartSelection = (nextStart) => {
    resetSubmissionState();
    setStartTime(nextStart);
  };

  const handleDurationSelection = (nextDuration) => {
    resetSubmissionState();
    setDurationInput(nextDuration);
  };

  const handleMediaChange = (event) => {
    resetSubmissionState();
    const file = event.target.files?.[0] || null;
    setMediaFile(file);
  };

  const validateStepOne = () => {
    if (!adForm.title.trim()) return "Enter an ad title.";
    if (!adForm.description.trim()) return "Enter a short ad description.";
    if (!mediaFile) return "Upload the ad file from your browser.";
    if (!date || !selectedWindow || !startTime || !endTime || !durationInput) {
      return "Choose the date card, available window, start time, and running minutes.";
    }
    if (!pricing.valid) return pricing.message;
    return "";
  };

  const validateReviewStep = () => {
    if (!customer.name.trim()) return "Enter the advertiser name.";
    if (!isValidPakistaniMobile(customer.phone)) return "Enter a valid Pakistani mobile number in the format 03xxxxxxxxx.";
    return "";
  };

  const handleContinue = () => {
    const validationMessage = validateStepOne();
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setErrorMessage("");
    setStep(2);
  };

  const handleSubmitRequest = async () => {
    const stepOneMessage = validateStepOne();
    if (stepOneMessage) {
      setErrorMessage(stepOneMessage);
      setStep(1);
      return;
    }

    const reviewMessage = validateReviewStep();
    if (reviewMessage) {
      setErrorMessage(reviewMessage);
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("title", adForm.title);
      formData.append("description", adForm.description);
      formData.append("duration", adForm.duration || "30");
      formData.append("media", mediaFile);

      let adResponse;
      try {
        adResponse = await uploadAd(formData);
      } catch (error) {
        throw new Error(getRequestErrorMessage(error, "ad upload"));
      }

      const adId = adResponse.data?._id;
      if (!adId) {
        throw new Error("Ad upload failed before booking request could be created.");
      }

      let bookingResponse;
      try {
        bookingResponse = await createBooking({
          adId,
          billboardId: billboard._id,
          date,
          timeSlot: `${startTime}-${endTime}`,
          totalPrice: pricing.totalPrice,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
        });
      } catch (error) {
        throw new Error(getRequestErrorMessage(error, "booking request submission"));
      }

      clearStoredContext();
      setResult({
        title: "Booking Request Sent",
        message:
          bookingResponse.data?.message ||
          "Your booking request has been sent to the admin. Payment will appear in My Bookings only after the admin approves this request.",
      });
    } catch (error) {
      setErrorMessage(error.message || "Could not create the booking request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!billboard) return null;

  return (
    <div className="flex min-h-[calc(100vh-140px)] justify-center pb-20">
      <div className="w-full max-w-6xl rounded-[30px] border border-sky-500/20 bg-[#101827]/90 p-8 shadow-[0_30px_120px_rgba(8,15,30,0.45)]">
        {result ? (
          <div className="mx-auto max-w-3xl py-12 text-center">
            <CheckCircle2 size={62} className="mx-auto mb-5 text-emerald-400" />
            <h2 className="text-3xl font-black text-white">{result.title}</h2>
            <p className="mt-3 text-blue-100/70">{result.message}</p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/advertiser/my-bookings")}
                className="rounded-xl bg-sky-500 px-6 py-3 text-sm font-bold text-white hover:bg-sky-400"
              >
                Go to My Bookings
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-6">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300/60">Advertiser Booking Flow</p>
                  <h1 className="mt-2 text-3xl font-black text-white">Book {billboard.name}</h1>
                  <p className="mt-2 max-w-3xl text-sm text-blue-100/60">
                    Select the date, slot, and ad details first. This request goes to admin for approval before any payment is shown to the advertiser.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {[1, 2].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-black ${
                          step >= item ? "border-sky-400 bg-sky-500 text-white" : "border-white/15 bg-white/5 text-white/40"
                        }`}
                      >
                        {item}
                      </div>
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                        {item === 1 ? "Slot + Ad" : "Review"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {step === 1 ? (
                <>
                  <div className="rounded-3xl border border-white/10 bg-[#0A0F1C]/70 p-6">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300/60">Available Dates</p>
                    <h2 className="mt-2 text-xl font-black text-white">Choose a day for this billboard</h2>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {availableDateCards.map((card) => (
                        <button
                          key={card.value}
                          type="button"
                          onClick={() => handleDateSelection(card.value)}
                          className={`rounded-2xl border p-4 text-left transition ${
                            date === card.value
                              ? "border-sky-400 bg-sky-500/10 text-white"
                              : "border-white/10 bg-white/5 text-blue-100/70 hover:border-sky-500/30"
                          }`}
                        >
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300/70">{card.weekday}</p>
                          <p className="mt-2 text-xl font-black">{card.shortLabel}</p>
                          <p className="mt-1 text-sm text-blue-100/55">{card.slotCount} configured slot(s)</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-[#0A0F1C]/70 p-6">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300/60">Free Window Cards</p>
                    <h2 className="mt-2 text-xl font-black text-white">Select a free availability window</h2>

                    {!date ? (
                      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-blue-100/55">
                        Pick a date first to load the available windows.
                      </div>
                    ) : availability.availableSlots.length === 0 ? (
                      <>
                        <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
                          {availability.statusMessage || "No free windows were found for this date."}
                        </div>
                        {availability.occupiedSlots.length > 0 && (
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {availability.occupiedSlots.map((slot) => (
                              <div
                                key={`${slot.bookingId}-${slot.timeSlot}`}
                                className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-left"
                              >
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-200/80">Not Available</p>
                                <p className="mt-2 text-lg font-black text-white">{formatTimeRange(slot.timeSlot)}</p>
                                <p className="mt-1 text-sm text-red-100/85">{slot.message || getOccupiedWindowTone(slot)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          {availability.availableSlots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => handleWindowSelect(slot)}
                              className={`rounded-2xl border p-4 text-left transition ${
                                selectedWindow === slot
                                  ? "border-sky-400 bg-sky-500/10 text-white"
                                  : "border-white/10 bg-white/5 text-blue-100/70 hover:border-sky-500/30"
                              }`}
                            >
                              <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300/70">Free Window</p>
                              <p className="mt-2 text-lg font-black">{formatTimeRange(slot)}</p>
                              <p className="mt-1 text-sm text-blue-100/55">{getSlotDurationMinutes(slot)} minute(s) available</p>
                            </button>
                          ))}
                        </div>
                        {availability.occupiedSlots.length > 0 && (
                          <div className="mt-5">
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-red-200/70">Occupied Windows</p>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              {availability.occupiedSlots.map((slot) => (
                                <div
                                  key={`${slot.bookingId}-${slot.timeSlot}`}
                                  className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4"
                                >
                                  <p className="text-xs font-black uppercase tracking-[0.2em] text-red-200/80">Not Available</p>
                                  <p className="mt-2 text-lg font-black text-white">{formatTimeRange(slot.timeSlot)}</p>
                                  <p className="mt-1 text-sm text-red-100/80">{slot.message || getOccupiedWindowTone(slot)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-[#0A0F1C]/70 p-6">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300/60">Ad Run Time</p>
                    <h2 className="mt-2 text-xl font-black text-white">Choose the exact run within that free window</h2>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/45">Start Time</span>
                        <div className="relative">
                          <Clock3 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/45" />
                          <select
                            value={startTime}
                            disabled={!selectedWindow || startTimeOptions.length === 0}
                            onChange={(event) => handleStartSelection(event.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-[#101827] py-3 pl-11 pr-4 text-white focus:border-sky-500 focus:outline-none [color-scheme:dark] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {!selectedWindow ? <option value="">Select a slot card first</option> : null}
                            {selectedWindow && startTimeOptions.length === 0 ? <option value="">No valid start time</option> : null}
                            {startTimeOptions.map((option) => (
                              <option key={option} value={option}>
                                {format24To12Hour(option)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/45">Minutes to Run</span>
                        <input
                          type="number"
                          min="1"
                          max={maxDurationForCurrentStart || getSlotDurationMinutes(selectedWindow) || 1}
                          value={durationInput}
                          disabled={!selectedWindow}
                          onChange={(event) => handleDurationSelection(event.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[#101827] px-4 py-3 text-white focus:border-sky-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Enter minutes"
                        />
                        <span className="mt-2 block text-xs text-blue-100/45">
                          {selectedWindow
                            ? `You can run from 1 up to ${maxDurationForCurrentStart || getSlotDurationMinutes(selectedWindow)} minute(s) from this start time.`
                            : "Pick a free slot card first."}
                        </span>
                      </label>
                    </div>

                    {quickDurationOptions.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {quickDurationOptions.map((minutes) => (
                          <button
                            key={minutes}
                            type="button"
                            onClick={() => handleDurationSelection(String(minutes))}
                            className={`rounded-full border px-3 py-1 text-xs font-black transition ${
                              Number(durationInput) === minutes
                                ? "border-sky-400 bg-sky-500/10 text-white"
                                : "border-white/10 bg-white/5 text-blue-100/60 hover:border-sky-500/30"
                            }`}
                          >
                            {minutes} min
                          </button>
                        ))}
                      </div>
                    )}

                    {!pricing.valid ? (
                      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                        <AlertTriangle size={16} className="text-amber-300" /> {pricing.message}
                      </div>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
                        <div className="grid gap-3 text-sm text-sky-100/85 md:grid-cols-2">
                          <p><span className="font-black text-white">Day:</span> {formatDateCard(date).weekday}, {formatDateCard(date).label}</p>
                          <p><span className="font-black text-white">Window Card:</span> {pricing.availableWindowLabel}</p>
                          <p><span className="font-black text-white">Selected Run:</span> {pricing.formattedSlot}</p>
                          <p><span className="font-black text-white">Formula:</span> {pricing.formula}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-[#0A0F1C]/70 p-6">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300/60">Creative Upload</p>
                    <h2 className="mt-2 text-xl font-black text-white">Upload the ad for admin review</h2>

                    <div className="mt-5 grid gap-4">
                      <input
                        type="text"
                        value={adForm.title}
                        onChange={(event) => updateAdField("title", event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#101827] px-4 py-3 text-white focus:border-sky-500 focus:outline-none"
                        placeholder="Ad title"
                      />
                      <textarea
                        rows={4}
                        value={adForm.description}
                        onChange={(event) => updateAdField("description", event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#101827] px-4 py-3 text-white focus:border-sky-500 focus:outline-none"
                        placeholder="Short ad description"
                      />
                      <div className="grid gap-4 md:grid-cols-[0.45fr_0.55fr]">
                        <input
                          type="number"
                          value={adForm.duration}
                          onChange={(event) => updateAdField("duration", event.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[#101827] px-4 py-3 text-white focus:border-sky-500 focus:outline-none"
                          placeholder="Ad duration (seconds)"
                        />
                        <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/5 px-5 py-4 text-sm font-black text-white/75 hover:border-sky-500/30 hover:text-white">
                          <Upload size={18} className="text-sky-300" />
                          <span>{mediaFile ? mediaFile.name : "Choose ad image or video"}</span>
                          <input type="file" accept="image/*,video/*" onChange={handleMediaChange} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {errorMessage}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleContinue}
                      className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-sm font-black text-white hover:bg-sky-400"
                    >
                      Continue to Review <ChevronRight size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-3xl border border-white/10 bg-[#0A0F1C]/70 p-6">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300/60">Advertiser Details</p>
                    <h2 className="mt-2 text-xl font-black text-white">Confirm the contact details for admin</h2>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/45">Name</span>
                        <div className="relative">
                          <UserRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/45" />
                          <input
                            type="text"
                            value={customer.name}
                            onChange={(event) => updateCustomerField("name", event.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-[#101827] py-3 pl-11 pr-4 text-white focus:border-sky-500 focus:outline-none"
                            placeholder="Advertiser name"
                          />
                        </div>
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/45">Phone</span>
                        <div className="relative">
                          <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/45" />
                          <input
                            type="tel"
                            value={customer.phone}
                            onChange={(event) => updateCustomerField("phone", event.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-[#101827] py-3 pl-11 pr-4 text-white focus:border-sky-500 focus:outline-none"
                            placeholder="03xxxxxxxxx"
                          />
                        </div>
                      </label>
                      <label className="block md:col-span-2">
                        <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/45">Email</span>
                        <div className="relative">
                          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/45" />
                          <input
                            type="email"
                            value={customer.email}
                            readOnly
                            className="w-full rounded-xl border border-white/10 bg-[#101827]/70 py-3 pl-11 pr-4 text-white/70 focus:outline-none"
                            placeholder="Verified advertiser email"
                          />
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-[#0A0F1C]/70 p-6">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300/60">Request Flow</p>
                    <h2 className="mt-2 text-xl font-black text-white">What happens next</h2>

                    <div className="mt-5 space-y-3 text-sm text-blue-100/70">
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                        1. This booking request goes to the billboard admin first.
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                        2. If the admin approves it, the payment option appears inside <span className="font-black text-white">My Bookings</span>.
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                        3. After you pay successfully, the booking becomes scheduled automatically without another admin confirmation.
                      </div>
                      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4 text-red-200">
                        If the admin rejects the request, the flow stops there and no payment is required.
                      </div>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {errorMessage}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-white/40 hover:text-white"
                    >
                      <ArrowLeft size={14} /> Back to Slot and Ad
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleSubmitRequest}
                      className="rounded-xl bg-sky-500 px-6 py-3 text-sm font-black text-white hover:bg-sky-400 disabled:opacity-50"
                    >
                      {submitting ? "Sending Request..." : "Send Booking Request"}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-5">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0A0F1C]/70">
                <div className="h-52 bg-black/40">
                  {billboard.imageUrl ? (
                    <img src={buildMediaUrl(billboard.imageUrl)} alt={billboard.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/25">
                      <ImagePlus size={38} />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300/60">Billboard</p>
                  <h2 className="mt-2 text-xl font-black text-white">{billboard.name}</h2>
                  <p className="mt-2 flex items-center gap-2 text-sm text-blue-100/60">
                    <MapPin size={14} className="text-sky-300" /> {billboard.city}, {billboard.location}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#0A0F1C]/70 p-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300/60">Order Summary</p>
                <h3 className="mt-2 text-lg font-black text-white">{adForm.title || "Your ad booking"}</h3>

                <div className="mt-4 space-y-3 text-sm text-blue-100/65">
                  <div className="flex items-center justify-between gap-4">
                    <span>Rate</span>
                    <span className="text-white">PKR {Number(billboard.pricePerMinute ?? billboard.pricePerHour ?? 0).toFixed(2)} / min</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Date</span>
                    <span className="text-white">{date ? `${formatDateCard(date).weekday}, ${formatDateCard(date).label}` : "Not selected"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Window Card</span>
                    <span className="text-white">{selectedWindow ? formatTimeRange(selectedWindow) : "Not selected"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Time Slot</span>
                    <span className="text-white">{pricing.valid ? pricing.formattedSlot : "Not selected"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Duration</span>
                    <span className="text-white">{pricing.valid ? `${pricing.durationMinutes} mins` : "--"}</span>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-4 text-base font-black text-white">
                    <span>Total Request Value</span>
                    <span>PKR {pricing.valid ? pricing.totalPrice.toFixed(2) : "0.00"}</span>
                  </div>
                  <p className="mt-2 text-xs text-blue-100/45">
                    {pricing.valid ? pricing.formula : "Example: PKR 3/min for 4 minutes = PKR 12."} The admin reviews this first. Payment appears later in My Bookings after approval.
                  </p>
                </div>

                {previewUrl && (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-[#101827] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300/60">Ad Preview</p>
                    <div className="mt-3 overflow-hidden rounded-2xl bg-black/30">
                      {mediaFile?.type?.startsWith("video/") ? (
                        <video src={previewUrl} controls className="h-48 w-full object-cover" />
                      ) : (
                        <img src={previewUrl} alt="Ad preview" className="h-48 w-full object-cover" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

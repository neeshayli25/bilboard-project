import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCities, getBillboardsByCity, getBillboardAvailability, createBooking, uploadAd, submitManualPayment } from "../../api";

const steps = ["Select City", "Choose Billboard", "Select Date & Slot", "Upload Ad", "Payment"];

export default function CreateBooking() {
  const [currentStep, setCurrentStep] = useState(0);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [billboards, setBillboards] = useState([]);
  const [selectedBillboard, setSelectedBillboard] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [availability, setAvailability] = useState({ availableSlots: [], pricePerHour: 0 });
  const [selectedSlot, setSelectedSlot] = useState("");
  const [totalPrice, setTotalPrice] = useState(0);
  const [adFile, setAdFile] = useState(null);
  const [adTitle, setAdTitle] = useState("");
  const [adDescription, setAdDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [transactionId, setTransactionId] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getCities().then(res => setCities(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedCity) {
      getBillboardsByCity(selectedCity).then(res => setBillboards(res.data)).catch(console.error);
    }
  }, [selectedCity]);

  useEffect(() => {
    if (selectedBillboard && selectedDate) {
      getBillboardAvailability(selectedBillboard._id, selectedDate).then(res => {
        setAvailability(res.data);
        setSelectedSlot("");
      }).catch(console.error);
    }
  }, [selectedBillboard, selectedDate]);

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setTotalPrice(availability.pricePerHour);
  };

  const handleAdUpload = async () => {
    if (!adFile) return alert("Please select a file");
    setUploading(true);
    const formData = new FormData();
    formData.append("title", adTitle);
    formData.append("description", adDescription);
    formData.append("media", adFile);
    try {
      const res = await uploadAd(formData);
      return res.data._id;
    } catch (err) {
      alert("Upload failed: " + (err.response?.data?.message || err.message));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!bookingId) {
      alert("Booking not created yet. Please complete previous steps.");
      return;
    }
    setSubmittingPayment(true);
    try {
      await submitManualPayment({ bookingId, transactionId });
      alert("Payment submitted! Admin will verify and approve your booking.");
      navigate("/advertiser/my-bookings");
    } catch (err) {
      alert(err.response?.data?.message || "Submission failed");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 0 && !selectedCity) return alert("Select a city");
    if (currentStep === 1 && !selectedBillboard) return alert("Select a billboard");
    if (currentStep === 2 && (!selectedDate || !selectedSlot)) return alert("Select date and time slot");
    if (currentStep === 3 && (!adTitle || !adDescription || !adFile)) return alert("Fill ad details and upload file");

    if (currentStep === 3) {
      setUploading(true);
      const adId = await handleAdUpload();
      if (!adId) {
        setUploading(false);
        return;
      }
      try {
        const bookingRes = await createBooking({
          adId,
          billboardId: selectedBillboard._id,
          date: selectedDate,
          timeSlot: selectedSlot,
          totalPrice,
        });
        setBookingId(bookingRes.data._id);
      } catch (err) {
        alert("Booking creation failed: " + (err.response?.data?.message || err.message));
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    setCurrentStep(prev => prev + 1);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div>
            <label className="block font-medium mb-2">Select City</label>
            <select className="w-full border rounded-xl p-3" value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
              <option value="">-- Choose City --</option>
              {cities.map(city => <option key={city} value={city}>{city}</option>)}
            </select>
          </div>
        );
      case 1:
        return (
          <div>
            <h3 className="font-medium mb-3">Available Billboards in {selectedCity}</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {billboards.map(b => (
                <div key={b._id} className={`border rounded-xl p-4 cursor-pointer transition ${selectedBillboard?._id === b._id ? 'border-indigo-500 bg-indigo-50' : 'hover:border-gray-300'}`} onClick={() => setSelectedBillboard(b)}>
                  <div className="flex justify-between">
                    <h4 className="font-bold">{b.name}</h4>
                    <span className="text-indigo-600">PKR {b.pricePerHour}/hour</span>
                  </div>
                  <p className="text-sm text-gray-600">{b.location}, {b.city}</p>
                  <p className="text-sm">Type: {b.type} | Resolution: {b.resolution}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <label className="block font-medium mb-2">Select Date</label>
            <input type="date" className="w-full border rounded-xl p-3 mb-4" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            {availability.availableSlots && availability.availableSlots.length > 0 ? (
              <div>
                <h3 className="font-medium mb-2">Available Time Slots</h3>
                <div className="flex flex-wrap gap-2">
                  {availability.availableSlots.map(slot => (
                    <button key={slot} className={`px-4 py-2 rounded-full text-sm font-medium ${selectedSlot === slot ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`} onClick={() => handleSlotSelect(slot)}>
                      {slot}
                    </button>
                  ))}
                </div>
                {selectedSlot && <p className="mt-4 text-indigo-600 font-semibold">Total Price: PKR {totalPrice}</p>}
              </div>
            ) : selectedDate && <p className="text-red-500">No slots available for this date.</p>}
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <input type="text" placeholder="Ad Title" className="w-full border rounded-xl p-3" value={adTitle} onChange={e => setAdTitle(e.target.value)} />
            <textarea placeholder="Ad Description" rows="3" className="w-full border rounded-xl p-3" value={adDescription} onChange={e => setAdDescription(e.target.value)} />
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
              <input type="file" accept="image/*,video/*" onChange={e => setAdFile(e.target.files[0])} />
              {adFile && <p className="mt-2 text-sm text-green-600">File selected: {adFile.name}</p>}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Payment Instructions</h3>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p>Billboard: {selectedBillboard?.name}</p>
              <p>Date: {selectedDate} | Slot: {selectedSlot}</p>
              <p className="text-2xl font-bold text-indigo-600 mt-2">PKR {totalPrice}</p>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-semibold">Pay to Easypaisa account:</p>
                <p className="text-lg font-mono">{selectedBillboard?.easypaisaNumber || "Not provided"}</p>
                <p className="text-sm text-gray-600 mt-2">After payment, enter the transaction ID (optional) and click "I have paid".</p>
              </div>
              <input
                type="text"
                placeholder="Transaction ID (optional)"
                className="w-full border rounded-xl p-2 mt-3"
                value={transactionId}
                onChange={e => setTransactionId(e.target.value)}
              />
              <button
                onClick={handleSubmitPayment}
                disabled={submittingPayment}
                className="mt-4 w-full bg-green-600 text-white py-2 rounded-xl font-semibold"
              >
                {submittingPayment ? 'Submitting...' : 'I have paid'}
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Booking</h1>
      <div className="flex justify-between mb-8">
        {steps.map((step, idx) => (
          <div key={idx} className={`flex-1 text-center ${idx <= currentStep ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${idx <= currentStep ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>{idx + 1}</div>
            <p className="text-xs mt-1">{step}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-lg p-6">
        {renderStep()}
        <div className="flex justify-between mt-8">
          {currentStep > 0 && <button onClick={() => setCurrentStep(prev => prev - 1)} className="px-5 py-2 border rounded-xl">Back</button>}
          {currentStep !== steps.length - 1 && (
            <button onClick={handleNext} disabled={uploading} className="px-6 py-2 bg-indigo-600 text-white rounded-xl ml-auto">
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
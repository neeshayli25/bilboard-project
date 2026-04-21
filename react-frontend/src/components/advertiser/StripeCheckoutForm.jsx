import { useState } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { Loader2, CreditCard } from "lucide-react";
import { confirmPayment } from "../../api";

export default function StripeCheckoutForm({ clientSecret, bookingId, onSuccess, amount }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    const { paymentIntent, error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
    });

    if (stripeError) {
      setError(stripeError.message);
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      try {
        // Inform backend to confirm payment transaction
        await confirmPayment({ bookingId, paymentIntentId: paymentIntent.id, paymentMethod: "stripe" });
        onSuccess();
      } catch (err) {
        setError("Payment succeeded but database update failed. Please contact support.");
      }
      setProcessing(false);
    }
  };

  const cardStyle = {
    style: {
      base: {
        color: "#ffffff",
        fontFamily: '"Inter", sans-serif',
        fontSmoothing: "antialiased",
        fontSize: "16px",
        "::placeholder": {
          color: "#94a3b8",
        },
      },
      invalid: {
        color: "#fa755a",
        iconColor: "#fa755a",
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-darkBg p-4 border border-white/10 rounded-xl shadow-inner">
        <CardElement options={cardStyle} />
      </div>

      {error && <div className="text-danger text-sm bg-danger/10 p-3 rounded-lg border border-danger/20">{error}</div>}

      <button
        disabled={processing || !stripe}
        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white font-medium py-3 rounded-xl transition disabled:opacity-50 shadow-lg shadow-primary/20"
      >
        {processing ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
        {processing ? "Processing..." : `Pay PKR ${amount}`}
      </button>
    </form>
  );
}

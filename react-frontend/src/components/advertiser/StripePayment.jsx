import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

export default function StripePayment({ amount, onSuccess, bookingId }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    // First, create payment intent from backend
    const res = await fetch('/api/advertiser/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      body: JSON.stringify({ amount, currency: 'pkr' }),
    });
    const { clientSecret } = await res.json();
    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    });
    if (stripeError) {
      setError(stripeError.message);
      setProcessing(false);
      return;
    }
    if (paymentIntent.status === 'succeeded') {
      // Confirm booking with backend
      const confirmRes = await fetch('/api/advertiser/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` },
        body: JSON.stringify({ bookingId, paymentIntentId: paymentIntent.id, paymentMethod: 'stripe' }),
      });
      if (confirmRes.ok) {
        onSuccess();
      } else {
        setError('Booking confirmation failed');
      }
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      {error && <div className="text-red-600 mt-2">{error}</div>}
      <button type="submit" disabled={processing || !stripe} className="mt-4 w-full bg-indigo-600 text-white py-2 rounded">
        {processing ? 'Processing...' : `Pay PKR ${amount}`}
      </button>
    </form>
  );
}
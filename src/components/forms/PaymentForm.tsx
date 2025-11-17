import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';


// Load Stripe with Publishable Key from .env
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Define form schema with Zod
const paymentSchema = z.object({
  eventId: z.string().min(1, { message: 'Event ID is required' }),
  userId: z.string().min(1, { message: 'User ID is required' }),
  priceId: z.string().min(1, { message: 'Price ID is required' }),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  onSuccess: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ onSuccess }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      eventId: 'soiree-gala-123', // Replace with dynamic ID
      userId: 'user-123', // Replace with Appwrite user ID
      priceId: 'price_xxxxxxxxxxxxxxxxxxxxxxxx', // Replace with your Stripe Price ID
    },
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit: SubmitHandler<PaymentFormData> = async (data) => {
    setErrorMessage(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_APPWRITE_FUNCTION_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      const stripe = await stripePromise;
      await stripe.redirectToCheckout({ sessionId: result.sessionId });
    } catch (error) {
      console.error('Payment error:', error);
      setErrorMessage('Payment initiation failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input
        type="hidden"
        {...register('eventId')}
      />
      {errors.eventId && <p className="text-red-500 text-xs mt-1">{errors.eventId.message}</p>}
      <input
        type="hidden"
        {...register('userId')}
      />
      {errors.userId && <p className="text-red-500 text-xs mt-1">{errors.userId.message}</p>}
      <input
        type="hidden"
        {...register('priceId')}
      />
      {errors.priceId && <p className="text-red-500 text-xs mt-1">{errors.priceId.message}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
      >
        {isSubmitting ? 'Processing...' : 'Pay with Stripe'}
      </button>
      {errorMessage && <p className="text-red-500 text-xs mt-1">{errorMessage}</p>}
    </form>
  );
};

export default PaymentForm;
import { useState } from "react";
  import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
  import { toast } from 'react-hot-toast';
  import { Button } from "@/components/ui";

  interface PaymentFormProps {
    amount: number;
    userId: string;
    onSuccess: (amount: number) => void;
  }

  const PaymentForm = ({ amount, userId, onSuccess }: PaymentFormProps) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
      event.preventDefault();
      setIsLoading(true);

      try {
        const response = await fetch(`${import.meta.env.VITE_APPWRITE_FUNCTION_URL}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amount * 100,
            userId,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }
        const { clientSecret } = await response.json();

        if (!stripe || !elements) throw new Error('Stripe or Elements not initialized');

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) throw new Error('CardElement not found');

        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
          },
        });

        if (result.error) {
          console.error("Stripe error:", result.error);
          throw new Error(result.error.message);
        } else if (result.paymentIntent.status === 'succeeded') {
          toast.success(`Payment of €${amount} successful!`);
          onSuccess(amount);
        }
      } catch (error:any) {
        console.error('Payment error:', error);
        toast.error(`Failed to process payment: ${error.message || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-light-1 font-medium">Card</h3>
          <div onClick={(e) => e.stopPropagation()} className="bg-dark-3 p-4 rounded-lg">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#fff',
                    '::placeholder': { color: '#aab7c4' },
                    backgroundColor: 'transparent',
                  },
                  invalid: { color: '#fa755a' },
                },
                hidePostalCode: true,
              }}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input 
            type="checkbox" 
            id="saveInfo" 
            className="h-4 w-4 text-primary-500 rounded border-dark-4 focus:ring-primary-500" 
          />
          <label htmlFor="saveInfo" className="text-light-2 text-sm">
            Securely save my information for 1-click checkout
          </label>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={!stripe || isLoading}
            className="w-full bg-primary-500 hover:bg-primary-600 py-2"
          >
            {isLoading ? 'Processing...' : `Pay €${amount}`}
          </Button>
        </div>

        <div className="text-center text-light-3 text-xs pt-2">
          <p>🐣 Free returns and exchanges</p>
          <p className="mt-1">Powered by Stripe</p>
        </div>
      </form>
    );
  };

  export default PaymentForm;
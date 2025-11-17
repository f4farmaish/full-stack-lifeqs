import { useState } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import axios from "axios";
import { useIncreaseWalletBalance } from "@/lib/react-query/queries";
import { Button } from "@/components/ui";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";

interface PaymentFormProps {
  amount: number;
  userId: string;
  onSuccess: (amount: number) => void;
  setError: (error: string | null) => void;
}

const PaymentForm = ({
  amount,
  userId,
  onSuccess,
  setError,
}: PaymentFormProps) => {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const { mutateAsync: increaseBalance } = useIncreaseWalletBalance();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data } = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/create-payment-intent`, {
        amount,
        userId,
      });

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { error, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card: cardElement },
      });

      if (error) throw new Error(error.message);

      if (paymentIntent.status === "succeeded") {
        await increaseBalance({ userId, amount });
        onSuccess(amount);
      }
    } catch (err: unknown) {
      console.error("Payment Error:", err);
      const errorMessage = err instanceof Error ? err.message : t("paymentForm.paymentFailed");
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <CardElement
          options={{
            style: {
              base: { fontSize: "16px", color: "#ffffff", "::placeholder": { color: "#a0aec0" } },
              invalid: { color: "#e53e3e" },
            },
            hidePostalCode: true,
          }}
        />
      </div>
      <Button
        type="submit"
        className="w-full bg-primary-500 hover:bg-primary-600"
        disabled={!stripe || !elements || isLoading}
      >
        {isLoading ? t("paymentForm.processing") : t("paymentForm.pay", { amount })}
      </Button>
    </form>
  );
};

export default PaymentForm;
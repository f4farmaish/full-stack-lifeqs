import { useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import SimpleModal from "@/components/shared/SimpleModal";
import PaymentForm from "./PaymentForm";
import { useTranslation } from "react-i18next";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentPopupProps {
  amount: number;
  onSuccess: (amount: number) => void;
  onClose: () => void;
  userId: string;
}

const PaymentPopup = ({
  amount,
  onSuccess,
  onClose,
  userId,
}: PaymentPopupProps) => {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  return (
    <SimpleModal isOpen={true} onClose={onClose} title={t("paymentPopup.topUpTitle", { amount })}>
      <div className="mt-4">
        <p className="text-center mb-4">{t("paymentPopup.topUpMessage", { amount })}</p>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <Elements stripe={stripePromise}>
          <PaymentForm
            amount={amount}
            userId={userId}
            onSuccess={onSuccess}
            setError={setError}
          />
        </Elements>
      </div>
    </SimpleModal>
  );
};

export default PaymentPopup;
import { IoClose } from "react-icons/io5";
import { useState, FC } from "react";

interface PromoCodePopupProps {
  onClose: () => void;
}

const PromoCodePopup: FC<PromoCodePopupProps> = ({ onClose }) => {
  const [code, setCode] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const handleApply = () => {
    if (!code.trim()) {
      setMessage("Please enter a promo code.");
      return;
    }

    // Example validation logic
    if (code === "SAVE10") {
      setMessage("Promo code applied! 🎉");
    } else {
      setMessage("Invalid promo code.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-80 rounded-xl p-5 shadow-xl relative">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-gray-500 hover:text-black"
        >
          <IoClose size={22} />
        </button>

        <h2 className="text-xl font-semibold mb-4 text-center">
          Enter Promo Code
        </h2>

        <input
          type="text"
          className="w-full border rounded-lg px-3 py-2 mb-3"
          placeholder="Enter promo code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        <button
          onClick={handleApply}
          className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium"
        >
          Apply Code
        </button>

        {message && (
          <p className="mt-3 text-center text-sm text-gray-700">{message}</p>
        )}
      </div>
    </div>
  );
};

export default PromoCodePopup;

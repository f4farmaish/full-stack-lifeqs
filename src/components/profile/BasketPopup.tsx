import React, { useState } from "react";
import { Trash2, ShoppingBag, CreditCard, X, Plus, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";

// Mock SimpleModal component since we don't have access to it
const SimpleModal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-gradient-to-br from-dark-2 to-dark-3 rounded-2xl shadow-2xl border border-dark-4 w-full max-w-md mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-dark-4">
          <h2 className="text-xl font-bold text-light-1 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary-500" />
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-4 rounded-full transition-colors">
            <X className="w-5 h-5 text-light-3" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// Mock Button component
const Button = ({ children, onClick, className, disabled, ...props }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...props}>
    {children}
  </button>
);

interface BasketItem {
  id: string;
  name: string;
  price: number;
  quantity?: number;
}

interface BasketPopupProps {
  isOpen: boolean;
  onClose: () => void;
  basket: Array<BasketItem>;
  onPay: () => Promise<void>;
  onRemoveItem?: (itemId: string) => void;
  onUpdateQuantity?: (itemId: string, quantity: number) => void;
}

const BasketPopup = ({
  isOpen,
  onClose,
  basket,
  onPay,
  onRemoveItem,
  onUpdateQuantity,
}: BasketPopupProps) => {
  const { t } = useTranslation();
  const [isPaying, setIsPaying] = useState(false);
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
  // Group items by id and calculate quantities
  const groupedBasket = basket.reduce(
    (acc, item) => {
      const existingItem = acc.find((i) => i.id === item.id);
      if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
      } else {
        acc.push({ ...item, quantity: item.quantity || 1 });
      }
      return acc;
    },
    [] as (BasketItem & { quantity: number })[]
  );

  const totalCost = basket.reduce((sum, item) => sum + item.price, 0);
  const totalItems = basket.length;

  const handlePay = async () => {
    setIsPaying(true);
    try {
      await onPay();
    } finally {
      setIsPaying(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!onRemoveItem) return;

    setRemovingItems((prev) => new Set([...prev, itemId]));
    try {
      await new Promise((resolve) => setTimeout(resolve, 300)); // Animation delay
      onRemoveItem(itemId);
    } finally {
      setRemovingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (!onUpdateQuantity || newQuantity < 1) return;
    onUpdateQuantity(itemId, newQuantity);
  };

  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title={t("basket.title")}>
      <div className="space-y-4">
        {basket.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 text-light-3 mx-auto mb-4" />
            <p className="text-light-2 text-lg mb-2">
              {t("basket.emptyBasket")}
            </p>
            <p className="text-light-3 text-sm">{t("basket.addItems")}</p>
          </div>
        ) : (
          <>
            {/* Items List */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {groupedBasket.map((item, index) => {
                const isRemoving = removingItems.has(item.id);
                return (
                  <div
                    key={`${item.id}-${index}`}
                    className={`group relative bg-gradient-to-r from-dark-3 to-dark-4 p-4 rounded-xl border border-dark-4 hover:border-primary-500/30 transition-all duration-300 ${
                      isRemoving
                        ? "opacity-50 scale-95"
                        : "hover:shadow-lg hover:shadow-primary-500/20"
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-light-1 font-medium truncate">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-primary-500 font-bold text-lg">
                            €{item.price.toFixed(2)}
                          </span>
                          {item.quantity > 1 && (
                            <span className="text-light-3 text-sm">
                              × {item.quantity}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {/* Quantity Controls */}
                        {onUpdateQuantity && (
                          <div className="flex items-center gap-1 bg-dark-3/80 rounded-lg p-1 border border-dark-4">
                            <button
                              onClick={() =>
                                handleUpdateQuantity(item.id, item.quantity - 1)
                              }
                              className="p-1 hover:bg-dark-4 rounded transition-colors text-light-3 hover:text-light-1"
                              disabled={item.quantity <= 1}>
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-light-1 text-sm px-2 font-medium min-w-[20px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                handleUpdateQuantity(item.id, item.quantity + 1)
                              }
                              className="p-1 hover:bg-dark-4 rounded transition-colors text-light-3 hover:text-light-1">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* Remove Button */}
                        {onRemoveItem && (
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={isRemoving}
                            className="p-2 hover:bg-red/20 rounded-lg transition-all duration-200 group-hover:opacity-100 opacity-60 hover:scale-110 border border-transparent hover:border-red/30"
                            title={t("basket.removeItem")}>
                            <Trash2 className="w-4 h-4 text-red hover:text-red" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Section */}
            <div className="bg-gradient-to-r from-primary-500/10 to-bleu-1/10 p-4 rounded-xl border border-primary-500/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-light-3">
                  {t("basket.items")} ({totalItems})
                </span>
                <span className="text-light-1">€{totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold">
                <span className="text-light-1">{t("basket.total")}</span>
                <span className="text-primary-500">
                  €{totalCost.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={onClose}
                className="flex-1 bg-dark-4 text-light-2 hover:bg-dark-3 border border-dark-4 hover:border-light-3/30 transition-all duration-200">
                {t("basket.continueShopping")}
              </Button>
              <Button
                onClick={handlePay}
                className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-500 text-light-1 font-semibold shadow-lg hover:shadow-xl hover:shadow-primary-500/25 transform hover:scale-[1.02] transition-all duration-200 disabled:from-light-4 disabled:to-light-4"
                disabled={basket.length === 0 || isPaying}>
                <CreditCard className="w-4 h-4 mr-2" />
                {isPaying
                  ? t("basket.processing")
                  : t("basket.pay", { amount: totalCost.toFixed(2) })}
              </Button>
            </div>

            {/* Remove All Items Button */}
            {basket.length > 1 && onRemoveItem && (
              <div className="pt-2 border-t border-dark-4">
                <Button
                  onClick={() => {
                    groupedBasket.forEach((item) => handleRemoveItem(item.id));
                  }}
                  className="w-full bg-red/10 text-red hover:bg-red/20 border border-red/30 hover:border-red/50 transition-all duration-200">
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("basket.clearAll")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1F1F22;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #5C5C7B;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #7878A3;
        }
      `}</style>
    </SimpleModal>
  );
};

export default BasketPopup;

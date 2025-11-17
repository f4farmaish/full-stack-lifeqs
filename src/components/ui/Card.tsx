import React, { FC, useCallback, useState } from 'react';
import { Card as CardType } from '@/types';

interface CardProps {
  card: CardType;
  addToBasket: (card: CardType) => void;
  Button: React.ElementType;
}

const Card: FC<CardProps> = ({ card, addToBasket, Button }) => {
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [priceOption, setPriceOption] = useState<number | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleAddToBasket = useCallback(() => {
    if (card.type === "PerDayPayment" && selectedDays === null) return;
    
    const cardToAdd:any = card.type === "PerDayPayment" 
      ? { ...card, selectedDays, price: priceOption }
      : card;
      
    addToBasket(cardToAdd);
    setIsFlipped(false);
  }, [card, addToBasket, selectedDays, priceOption]);

  const handleDaySelection = (days: number, price: number) => {
    setSelectedDays(days);
    setPriceOption(price);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Card Container with perspective */}
      <div 
        className="w-72 h-96 cursor-pointer relative"
        style={{ perspective: '1000px' }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Inner card that flips */}
        <div
          className={`relative w-full h-full transition-transform duration-500 ease-in-out ${isFlipped ? 'rotate-y-180' : ''}`}
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Front side */}
          <div className={`absolute inset-0 flex flex-col justify-center items-center p-8 rounded-xl shadow-lg bg-gradient-to-br from-dark-4 to-dark-3 text-light-1 border border-dark-4 ${isFlipped ? 'hidden' : 'block'}`}>
            <div className="absolute top-4 right-4 bg-indigo-600 text-xs font-bold px-2 py-1 rounded-full">
              {card.type === "PerDayPayment" ? "RENTAL" : "ONE-TIME"}
            </div>
            
                     <img
                    className="w-20 h-20 mb-4 object-contain"
                    src={card.symbol || 'https://via.placeholder.com/80'}
                    alt={card.name}
                  />
            
            <h3 className="text-2xl font-bold text-center mb-2 text-primary-500">{card.name}</h3>
            {card.level && (
              <span className="px-3 py-1 bg-dark-4 text-light-2 rounded-full text-xs font-semibold">
                {card.level}
              </span>
            )}
            
            {card.type === "OneTimePayment" && (
              <div className="mt-6 text-3xl font-bold text-primary-500">
                €{card.price?.toFixed(2)}
              </div>
            )}

            <div className="absolute bottom-4 text-xs text-light-4">
              Click to flip
            </div>
          </div>

          {/* Back side - scrollbar completely hidden */}
          <div
            className={`absolute inset-0 flex flex-col justify-betweenk items-center p-6 rounded-xl shadow-lg bg-gradient-to-br from-dark-4 to-dark-3 text-light-1 border border-dark-4 ${isFlipped ? 'block' : 'hidden'}`}
            style={{
              overflow: 'hidden'
            }}
          >
            <div className="w-full text-center">
              <h3 className="text-xl font-bold mb-1 text-primary-500">{card.name}</h3>
              {card.level && (
                <p className="text-xs mb-3 text-light-4">{card.level}</p>
              )}
            </div>

            <div className="flex-1 w-full">
              <div 
                className="h-full flex flex-col items-center p-2"
                style={{
                  overflow: 'auto',
                  scrollbarWidth: 'none', /* Firefox */
                  msOverflowStyle: 'none', /* Internet Explorer 10+ */
                }}
              >
                <style jsx>{`
                  div::-webkit-scrollbar {
                    display: none; /* Safari and Chrome */
                  }
                `}</style>
                <p className="text-sm text-center font-medium leading-relaxed text-light-2">
                  {card.description}
                </p>
                
                {card.type === "PerDayPayment" && card.dayNumber && (
                  <div className="mt-6 w-full">
                    <h4 className="text-sm font-semibold mb-3 text-light-3">Select rental period:</h4>
                    <div className="grid grid-cols-3 gap-3 mb-2">
                      {card.dayNumber.map((days, index) => {
                        const prices : any = card.price || [3, 6, 9];
                        const price = prices[index];
                        return (
                          <button
                            key={days}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDaySelection(days, price);
                            }}
                            className={`py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                              selectedDays === days
                                ? 'bg-primary-500 text-light-1 shadow-md'
                                : 'bg-dark-4 text-light-2 hover:bg-dark-3'
                            }`}
                          >
                            {price}€<br/>{days===-1 ? 'Unlimited' : days} days
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full text-center">
              {card.type === "OneTimePayment" ? (
                <p className="text-2xl font-bold text-primary-500">€{card.price?.toFixed(2)}</p>
              ) : (
                <p className="text-xl font-semibold">
                  {priceOption ? (
                    <span className="text-primary-500">€{priceOption.toFixed(2)}</span>
                  ) : (
                    <span className="text-light-4">Select option</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Buy Button */}
      <Button
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          handleAddToBasket();
        }}
        className={`mt-6 px-8 py-3 rounded-xl font-bold text-white transition-all duration-300 ${
          card.type === "PerDayPayment" && selectedDays === null
            ? 'bg-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg'
        }`}
        aria-label={`Add ${card.name} to basket`}
        disabled={card.type === "PerDayPayment" && selectedDays === null}
      >
        {card.type === "PerDayPayment" ? 'RENT NOW' : 'BUY NOW'}
      </Button>

    </div>
  );
};

export default Card;
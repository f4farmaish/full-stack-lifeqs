import React, { useState, useCallback, useMemo, FC, useEffect } from 'react';
import CardComponent from '../../components/ui/Card'; 
import { Card } from '@/types';
import { getMyCardsByUserId } from '@/services/MyCardService';
import { Models } from 'appwrite';

interface AllCardsProps {
  userId: string;
  walletBalance: number;
  cardsData: Card[];
  cardCategories: string[];
  Button: React.ElementType;
  basket: Card[]; // Changed 'any' to 'Card[]' for better typing
  setBasket: (basket: Card[]) => void;
}

const AllCards: FC<AllCardsProps> = ({
  userId,
  walletBalance,
  cardsData,
  cardCategories,
  Button,
  basket,
  setBasket,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All cards');
  const [purchasedCards, setPurchasedCards] = useState<Models.Document[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);

  // Fetch purchased cards on mount
  useEffect(() => {
    const fetchPurchasedCards = async () => {
      if (!userId) return;
      setIsLoadingCards(true);
      try {
        const fetchedCards = await getMyCardsByUserId(userId);
        setPurchasedCards(fetchedCards);
      } catch (error) {
        console.error('Failed to fetch purchased cards:', error);
      } finally {
        setIsLoadingCards(false);
      }
    };
    fetchPurchasedCards();
  }, [userId]);

  const addToBasket = useCallback((card: Card) => { // Using Card type
    // ▼ FIX: Prevent adding duplicate items to the basket
    if (basket.some((item) => item.id === card.id)) {
      alert('Item is already in your basket.');
      return;
    }

    const totalCostInBasket = basket.reduce((sum, c) => sum + (c.price || 0), 0);
    const newTotalCost = totalCostInBasket + (card.price || 0);

    if (walletBalance >= newTotalCost) {
      setBasket([...basket, card]);
    } else {
      alert('Insufficient funds. Please top up your wallet.');
    }
  }, [basket, walletBalance, setBasket]);

  const filteredCards = useMemo(() => {
    const purchasedOneTimeCardIds = purchasedCards
      .filter((cardDoc) => {
        const cardData = cardsData.find((c) => c.id === cardDoc.card_id);
        return cardData?.type === 'OneTimePayment';
      })
      .map((cardDoc) => cardDoc.card_id);

    return selectedCategory === 'All cards'
      ? cardsData.filter((card) => !purchasedOneTimeCardIds.includes(card.id))
      : cardsData.filter(
          (card) =>
            card.category === selectedCategory &&
            !purchasedOneTimeCardIds.includes(card.id)
        );
  }, [selectedCategory, cardsData, purchasedCards]);

  return (
    // ▼ FIX: Removed 'max-w-screen-xl mx-auto' to fix the layout overlap issue
    <div className="p-6"> 
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>

      {isLoadingCards ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="animate-fadeIn">
          {/* Category Filters */}
          <div className="mb-6 overflow-x-auto flex gap-3 pb-2 sticky top-0 z-10 bg-dark-1/90 dark:bg-black/90 backdrop-blur-md">
            
            {/* ▼ UX FIX: Added "All cards" button */}
            <Button
              key="All cards"
              onClick={() => setSelectedCategory('All cards')}
              className={`whitespace-nowrap px-4 py-2 rounded-full transition ${
                selectedCategory === 'All cards'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 dark:bg-dark-4 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-dark-3'
              }`}
            >
              All cards
            </Button>
            
            {cardCategories.map((category) => (
              <Button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`whitespace-nowrap px-4 py-2 rounded-full transition ${
                  selectedCategory === category
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 dark:bg-dark-4 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-dark-3'
                }`}
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredCards.length > 0 ? (
              filteredCards.map((card) => (
                <CardComponent
                  key={card.id}
                  card={card}
                  addToBasket={addToBasket}
                  Button={Button}
                  // ▼ UX FIX: Added 'isAdded' prop to show "Added" status
                  isAdded={basket.some((item) => item.id === card.id)}
                />
              ))
            ) : (
              <p className="col-span-full text-center text-light-3 mt-10">
                No cards found in this category.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AllCards;
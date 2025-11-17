import React, { useState } from 'react';
import PropTypes from 'prop-types';

// QWallet Component
const QWallet = ({
  userId,
  onBackToProfile,
  walletBalance,
  setWalletBalance,
  cardsData,
  cardCategories,
  Button,
  basket,
  setBasket,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('All cards');
  const [activeTab, setActiveTab] = useState('All cards');
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [myCards, setMyCards] = useState([]);

  const topUpAmounts = [5, 10, 30, 50];

  // Handle wallet top-up with simulated Stripe payment
  const handleTopUp = async (amount) => {
    try {
      setWalletBalance(walletBalance + amount);
      setTransactionHistory([
        ...transactionHistory,
        {
          date: new Date().toISOString(),
          type: 'Top-up',
          amount,
          status: 'Completed',
        },
      ]);
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  // Add card to basket
  const addToBasket = (card) => {
    setBasket([...basket, card]);
  };

  // Handle purchase of cards in basket
  const handlePurchase = () => {
    const totalCost = basket.reduce((sum, card) => sum + card.price, 0);
    if (walletBalance >= totalCost) {
      setWalletBalance(walletBalance - totalCost);
      setMyCards([...myCards, ...basket]);
      setTransactionHistory([
        ...transactionHistory,
        {
          date: new Date().toISOString(),
          type: 'Purchase',
          amount: totalCost,
          items: basket.map((card) => card.name),
          status: 'Completed',
        },
      ]);
      setBasket([]);
    } else {
      alert('Insufficient funds. Please top up your wallet.');
    }
  };

  // Activate a card
  const activateCard = (card) => {
    setMyCards(
      myCards.map((c) =>
        c.id === card.id
          ? { ...c, activated: true, activationDate: new Date().toISOString() }
          : c
      )
    );
  };

  // Card sub-component
  const Card = ({ card }) => (
    <div className="flip-card w-48 h-64 perspective-1000">
      <div className="flip-card-inner relative w-full h-full transition-transform duration-600 transform-style-preserve-3d hover:rotate-y-180">
        <div className="flip-card-front absolute w-full h-full bg-dark-3 rounded-lg flex flex-col items-center justify-center backface-hidden">
          <span className="text-4xl text-light-1">{card.symbol}</span>
          <h3 className="text-lg font-bold mt-2 text-light-1">{card.name}</h3>
        </div>
        <div className="flip-card-back absolute w-full h-full bg-dark-4 rounded-lg flex flex-col items-center justify-center backface-hidden rotate-y-180">
          <p className="text-sm p-4 text-light-2">{card.description}</p>
          <p className="font-bold text-light-1">€{card.price}</p>
          <Button
            onClick={() => addToBasket(card)}
            className="mt-2 bg-primary-500 hover:bg-primary-600"
          >
            BUY
          </Button>
        </div>
      </div>
    </div>
  );

  Card.propTypes = {
    card: PropTypes.shape({
      id: PropTypes.string.isRequired,
      symbol: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      price: PropTypes.number.isRequired,
    }).isRequired,
  };

  // Filter cards based on selected category
  const filteredCards =
    selectedCategory === 'All cards'
      ? cardsData
      : cardsData.filter((card) => card.category === selectedCategory);

  return (
    <div className="qwallet-container p-4">
      {/* Wallet Balance and Top-Up */}
      

      {/* Tabs */}
      <div className="card-tabs flex gap-2 mb-4">
        {['All cards', 'My cards', 'History'].map((tab) => (
          <Button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`${
              activeTab === tab ? 'bg-dark-3 text-light-1' : 'bg-dark-4 text-light-2'
            } px-4 py-2 rounded-lg`}
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* All Cards Tab */}
      {activeTab === 'All cards' && (
        <>
          <div className="category-filters flex gap-2 mb-4">
            {['All cards', ...cardCategories].map((category) => (
              <Button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`${
                  selectedCategory === category ? 'bg-dark-3 text-light-1' : 'bg-dark-4 text-light-2'
                } px-4 py-2 rounded-lg`}
              >
                {category}
              </Button>
            ))}
          </div>

          <div className="cards-grid grid grid-cols-4 gap-4">
            {filteredCards.map((card) => (
              <Card key={card.id} card={card} />
            ))}
          </div>
        </>
      )}

      {/* My Cards Tab */}
      {activeTab === 'My cards' && (
        <div className="my-cards">
          <h3 className="text-light-1 mb-4">My Purchased Cards</h3>
          <div className="cards-grid grid grid-cols-4 gap-4">
            {myCards.map((card) => (
              <div key={card.id} className="card">
                <Card card={card} />
                {card.duration === 'permanent' ? (
                  <p className="text-green-500">Activated</p>
                ) : (
                  <>
                    <Button
                      onClick={() => activateCard(card)}
                      disabled={card.activated}
                      className="mt-2 bg-primary-500 hover:bg-primary-600"
                    >
                      {card.activated ? 'Activated' : 'Activate'}
                    </Button>
                    {card.activated && card.duration && (
                      <p className="text-light-2">
                        Remaining:{' '}
                        {Math.max(
                          0,
                          Math.ceil(
                            (new Date(card.activationDate).getTime() +
                              parseInt(card.duration) * 24 * 60 * 60 * 1000 -
                              new Date().getTime()) /
                              (24 * 60 * 60 * 1000)
                          )
                        )}{' '}
                        days
                      </p>
                    )}
                    {(card.category === 'Post Highlights' ||
                      card.category === 'My Post Tools') && (
                      <select className="mt-2 bg-dark-4 text-light-1 border border-dark-3 rounded">
                        <option>Select Post</option>
                        {/* Add post options dynamically */}
                      </select>
                    )}
                    {card.category === 'Gifts & Recognition' && (
                      <select className="mt-2 bg-dark-4 text-light-1 border border-dark-3 rounded">
                        <option>Select Member</option>
                        {/* Add member options dynamically */}
                      </select>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'History' && (
        <div className="history">
          <h3 className="text-light-1 mb-4">Transaction History</h3>
          <table className="w-full bg-dark-3 rounded-lg overflow-hidden">
            <thead className="bg-dark-4">
              <tr>
                <th className="text-light-1 p-3 text-left">Date</th>
                <th className="text-light-1 p-3 text-left">Type</th>
                <th className="text-light-1 p-3 text-left">Amount</th>
                <th className="text-light-1 p-3 text-left">Details</th>
                <th className="text-light-1 p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactionHistory.map((transaction, index) => (
                <tr key={index} className="border-b border-dark-4">
                  <td className="text-light-2 p-3">{new Date(transaction.date).toLocaleDateString()}</td>
                  <td className="text-light-2 p-3">{transaction.type}</td>
                  <td className="text-light-2 p-3">€{transaction.amount}</td>
                  <td className="text-light-2 p-3">
                    {transaction.items
                      ? transaction.items.join(', ')
                      : 'Wallet Top-up'}
                  </td>
                  <td className="text-light-2 p-3">{transaction.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// PropTypes for type checking
QWallet.propTypes = {
  userId: PropTypes.string.isRequired,
  onBackToProfile: PropTypes.func.isRequired,
  walletBalance: PropTypes.number.isRequired,
  setWalletBalance: PropTypes.func.isRequired,
  cardsData: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      symbol: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      price: PropTypes.number.isRequired,
      category: PropTypes.string.isRequired,
      duration: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ).isRequired,
  cardCategories: PropTypes.arrayOf(PropTypes.string).isRequired,
  Button: PropTypes.elementType.isRequired,
  basket: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      price: PropTypes.number.isRequired,
    })
  ).isRequired,
  setBasket: PropTypes.func.isRequired,
};

export default QWallet;
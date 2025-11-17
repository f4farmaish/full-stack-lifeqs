interface HistoryProps {
  userId: string;
  onBackToProfile: () => void;
  walletBalance: number;
  setWalletBalance: (balance: number) => void;
  cardsData: Array<{
    id: string;
    category: string;
    name: string;
    symbol: string;
    description: string;
    price: number;
    duration: string;
  }>;
  cardCategories: string[];
  Button: React.ComponentType<any>;
  basket: any[];
  setBasket: (basket: any[]) => void;
  myCards: any[];
  setMyCards: (cards: any[]) => void;
  transactionHistory: any[];
  setTransactionHistory: (history: any[]) => void;
}

declare const History: React.FC<HistoryProps>;
export default History; 
import { useState, useMemo } from "react";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Wallet,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getTransactionsByUserId } from "@/services/TransactionHistoryService";
import { Loader } from "@/components/shared";
import { useTranslation } from "react-i18next";

interface TransactionHistory {
  userId: string;
  transactionHistory: any;
}
const History = ({ userId, transactionHistory }: TransactionHistory) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch transactions using getTransactionsByUserId
  const {
    data: fetchedTransactions,
    isLoading,
    error,
  }: any = useQuery({
    queryKey: ["transactions", userId],
    queryFn: () => getTransactionsByUserId(userId),
    enabled: !!userId,
  });

  // Mock data if transactionHistory is empty and no fetched data

  const mockTransactions:any = [];


  // Use fetched transactions if available, fall back to transactionHistory or mockTransactions
  const transactions: any =
    fetchedTransactions?.length > 0
      ? fetchedTransactions
      : transactionHistory.length > 0
      ? transactionHistory
      : mockTransactions;

  const filteredTransactions: any = useMemo(() => {
    let filtered: any = transactions.filter((transaction: any) => {
      const matchesSearch = transaction.items
        ? transaction.items.some((item: any) =>
            item.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : transaction.type.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter =
        filterType === "all" ||
        transaction.type.toLowerCase() === filterType.toLowerCase();

      return matchesSearch && matchesFilter;
    });

    return filtered.sort((a: any, b: any) => {
      if (sortBy === "date") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === "amount") {
        return b.amount - a.amount;
      }
      return 0;
    });
  }, [transactions, searchTerm, filterType, sortBy]);

  const totalSpent = transactions
    .filter((t: any) => t.type === "Purchase")
    .reduce((sum: any, t: any) => sum + t.amount, 0);

  const totalTopups = transactions
    .filter((t: any) => t.type === "Top-up")
    .reduce((sum: any, t: any) => sum + t.amount, 0);

  // Helper function to translate transaction type
  const getTranslatedType = (type: string) => {
    const typeMap: { [key: string]: string } = {
      "Purchase": t("history.purchase"),
      "Top-up": t("history.topUp"),
      "Refund": t("history.refund"),
    };
    return typeMap[type] || type;
  };

  // Helper function to translate status
  const getTranslatedStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      "Completed": t("history.completed"),
      "Processing": t("history.processing"),
      "Failed": t("history.failed"),
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: any) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "processing":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTypeIcon = (type: any) => {
    switch (type.toLowerCase()) {
      case "purchase":
        return <CreditCard className="w-4 h-4 text-blue-400" />;
      case "top-up":
        return <Wallet className="w-4 h-4 text-green-400" />;
      case "refund":
        return <TrendingUp className="w-4 h-4 text-purple-400" />;
      default:
        return <TrendingDown className="w-4 h-4 text-gray-400" />;
    }
  };

  const getAmountColor = (type: any) => {
    switch (type.toLowerCase()) {
      case "purchase":
        return "text-red-400";
      case "top-up":
        return "text-green-400";
      case "refund":
        return "text-purple-400";
      default:
        return "text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-center w-full h-full">
        <p className="text-red-500">
          {t("history.failedToLoad")}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br p-4">
      <div className="w-full mx-auto">
        {/* Header Section - TITLE REMOVED, SPACING ADJUSTED */}
        <div className="mb-8 mt-4"> {/* Reduced top spacing slightly */}
          {/* The Title/Subtitle Div was removed completely */}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-800/40 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:bg-slate-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300 mb-1">{t("history.totalSpent")}</p>
                  <p className="text-2xl font-bold text-red-400">
                    €{totalSpent.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30">
                  <TrendingDown className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:bg-slate-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300 mb-1">{t("history.totalTopups")}</p>
                  <p className="text-2xl font-bold text-green-400">
                    €{totalTopups.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-xl border border-green-500/30">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:bg-slate-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300 mb-1">
                    {t("history.totalTransactions")}
                  </p>
                  <p className="text-2xl font-bold text-blue-400">
                    {transactions.length}
                  </p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                  <CreditCard className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-dark-2 backdrop-blur-sm rounded-2xl shadow-lg border border-dark-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-3 border-b border-dark-4">
                <tr>
                  <th className="text-left p-6 text-sm font-semibold text-gray-200">
                    {t("history.date")}
                  </th>
                  <th className="text-left p-6 text-sm font-semibold text-gray-200">
                    {t("history.type")}
                  </th>
                  <th className="text-left p-6 text-sm font-semibold text-gray-200">
                    {t("history.amount")}
                  </th>
                  <th className="text-left p-6 text-sm font-semibold text-gray-200">
                    {t("history.details")}
                  </th>
                  <th className="text-left p-6 text-sm font-semibold text-gray-200">
                    {t("history.status")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredTransactions.map((transaction: any, index: string) => (
                  <tr
                    key={transaction.id || index}
                    className="hover:bg-slate-700/30 transition-colors duration-150">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-700/50 rounded-lg">
                          <Calendar className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-200">
                            {new Date(
                              transaction.created_at
                            ).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-400">
                            {new Date(
                              transaction.created_at
                            ).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        {getTypeIcon(transaction.type)}
                        <span className="font-medium text-gray-200">
                          {getTranslatedType(transaction.type)}
                        </span>
                      </div>
                    </td>
                    <td className="p-6">
                      <span
                        className={`text-lg font-bold ${getAmountColor(
                          transaction.type
                        )}`}>
                        {transaction.type === "Purchase" ? "-" : "+"}€
                        {transaction.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="max-w-xs">
                        <p className="text-gray-200 truncate">
                          {transaction.details}
                        </p>
                      </div>
                    </td>
                    <td className="p-6">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          transaction.status
                        )}`}>
                        {getTranslatedStatus(transaction.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="p-12 text-center">
              <div className="p-4 bg-slate-700/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-200 mb-2">
                {t("history.noTransactionsFound")}
              </h3>
              <p className="text-gray-400">
                {t("history.adjustSearchFilter")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
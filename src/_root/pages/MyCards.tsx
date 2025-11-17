import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { Card, ITransactionHistory } from "@/types";
import { getMyCardsByUserId, updateMyCard } from "@/services/MyCardService";
import { getUserPosts, updatePost } from "@/services/postService";
import { useGetUsers } from "@/lib/react-query/queries";
import { toast } from "react-hot-toast";
import { databases } from "@/lib/appwrite/config";
import { appwriteConfig } from "@/lib/appwrite/config";
import { Search, X, ChevronDown, Users } from "lucide-react";
import {
  updateUserLevelAndPoints,
  sendGiftNotification,
} from "@/services/userService";
import { useTranslation } from "react-i18next";

interface MyCardsProps {
  userId: string;
  onBackToProfile: () => void;
  walletBalance: number;
  setWalletBalance: (balance: number) => void;
  cardsData: Card[];
  cardCategories: string[];
  Button: React.ElementType;
  basket: Card[];
  setBasket: (basket: Card[]) => void;
  myCards: any;
  setMyCards: (cards: Card[]) => void;
  transactionHistory: ITransactionHistory[];
  setTransactionHistory: (history: ITransactionHistory[]) => void;
}

const MyCards: FC<MyCardsProps> = ({
  userId,
  onBackToProfile,
  walletBalance,
  setWalletBalance,
  cardsData,
  cardCategories,
  Button,
  basket,
  setBasket,
  myCards,
  setMyCards,
  transactionHistory,
  setTransactionHistory,
}) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"post" | "user" | null>(null);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedUserIndex, setFocusedUserIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: users, isLoading: usersLoading } = useGetUsers();

  // Fetch cards on mount
  useEffect(() => {
    const fetchCards = async () => {
      if (!userId) return;
      setIsLoading(true);
      try {
        const fetchedCards = await getMyCardsByUserId(userId);
        const enrichedCards = fetchedCards.map((card) => {
          const cardData: any =
            cardsData.find((c) => c.id === card.card_id) || {};
          return {
            $id: card.$id,
            id: card.card_id,
            name: cardData.name || card.card_id,
            price: cardData.price || 0,
            type: cardData.type,
            category: cardData.category,
            description: cardData.description,
            level: cardData.level,
            symbol: cardData.symbol,
            dayNumber: cardData.dayNumber,
            selectedDays: cardData.selectedDays || cardData.dayNumber?.[0],
            is_active: card.is_active,
            expired_at: card.expired_at,
            post_id: card.post_id,
            recipient_id: card.recipient_id,
            activated: card.is_active,
            activationDate: card.$createdAt,
          };
        });
        setMyCards(enrichedCards);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : t("myCards.failedToFetchCards");
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCards();
  }, [userId, cardsData, setMyCards]);

  // Fetch posts on mount
  useEffect(() => {
    const fetchPosts = async () => {
      if (!userId) return;
      try {
        const fetchedPosts = await getUserPosts(userId, 10);
        setPosts(fetchedPosts);
      } catch (err) {
        toast.error(t("myCards.failedToFetchPosts"));
      }
    };
    fetchPosts();
  }, [userId]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowModal(false);
        setSearchTerm("");
        setFocusedUserIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll dropdown into view
  useEffect(() => {
    if (showModal && modalType === "user" && dropdownRef.current) {
      dropdownRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [showModal, modalType]);

  // Activate a card
  const activateCard = useCallback(
    async (card: any) => {
      if (!card.$id) return;
      try {
        await updateMyCard(card.$id, { is_active: true });
        setMyCards(
          myCards.map((c: any) =>
            c.id === card.id
              ? {
                  ...c,
                  activated: true,
                  is_active: true,
                  activationDate: new Date().toISOString(),
                }
              : c
          )
        );
        // Update post for highlight cards
        if (
          card.post_id &&
          card.is_active &&
          card.category === "Post Highlights"
        ) {
          const updateData: any = {};
          if (card.id === "6") {
            updateData.isInMainPage = true;
            updateData.expirationDateMainPage = card.expired_at;
          } else if (card.id === "7") {
            updateData.isInCategoryPage = true;
            updateData.expirationDateCategoryPage = card.expired_at;
          } else if (card.id === "8") {
            updateData.isInSubcategoryPage = true;
            updateData.expirationDateSubcategoryPage = card.expired_at;
          }
          if (Object.keys(updateData).length > 0) {
            try {
              await updatePost(card.post_id, updateData);
              toast.success(
                t("myCards.postHighlightedUntil", {
                  postId: card.post_id,
                  date: card.expired_at,
                })
              );
            } catch (err) {
              console.error(`Failed to update post ${card.post_id}:`, err);
              toast.error(t("myCards.failedToHighlightPost"));
            }
          }
        }
        toast.success(
          t("myCards.cardActivatedSuccess", { cardName: card.name })
        );
      } catch (err) {
        toast.error(t("myCards.failedToActivateCard"));
      }
    },
    [myCards, setMyCards]
  );

  // Handle post selection and update post
  const handleConfirmPost = useCallback(async () => {
    if (selectedPost && selectedCard && selectedCard.$id) {
      try {
        // Reset previous post if applicable
        if (selectedCard.post_id) {
          const resetData: any = {};
          if (selectedCard.id === "6") {
            resetData.isInMainPage = false;
            resetData.expirationDateMainPage = null;
          } else if (selectedCard.id === "7") {
            resetData.isInCategoryPage = false;
            resetData.expirationDateCategoryPage = null;
          } else if (selectedCard.id === "8") {
            resetData.isInSubcategoryPage = false;
            resetData.expirationDateSubcategoryPage = null;
          } else if (selectedCard.id === "19") {
            resetData.isPinnedOnProfile = false;
            resetData.expirationDateProfilePin = null;
          } else if (selectedCard.id === "20") {
            resetData.isPinnedOnGroup = false;
            resetData.expirationDateGroupPin = null;
          }
          if (Object.keys(resetData).length > 0) {
            try {
              await updatePost(selectedCard.post_id, resetData);
            } catch (err) {
              console.error(
                `Failed to reset post ${selectedCard.post_id}:`,
                err
              );
              toast.error(t("myCards.failedToResetPost"));
            }
          }
        }

        // Update card with new post_id
        await updateMyCard(selectedCard.$id, { post_id: selectedPost });
        setMyCards(
          myCards.map((c: any) =>
            c.$id === selectedCard.$id ? { ...c, post_id: selectedPost } : c
          )
        );
        const post = posts.find((p) => p.$id === selectedPost);

        // Update new post for highlight cards
        if (selectedCard.is_active) {
          const updateData: any = {};
          if (selectedCard.id === "6") {
            updateData.isInMainPage = true;
            updateData.expirationDateMainPage = selectedCard.expired_at;
          } else if (selectedCard.id === "7") {
            updateData.isInCategoryPage = true;
            updateData.expirationDateCategoryPage = selectedCard.expired_at;
          } else if (selectedCard.id === "8") {
            updateData.isInSubcategoryPage = true;
            updateData.expirationDateSubcategoryPage = selectedCard.expired_at;
          } else if (selectedCard.id === "19") {
            updateData.isPinnedOnProfile = true;
            updateData.expirationDateProfilePin = selectedCard.expired_at;
          } else if (selectedCard.id === "20") {
            updateData.isPinnedOnGroup = true;
            updateData.expirationDateGroupPin = selectedCard.expired_at;
          }
          if (Object.keys(updateData).length > 0) {
            try {
              await updatePost(selectedPost, updateData);
              toast.success(
                t("myCards.postHighlightedWithTitle", {
                  title: post?.title || selectedPost,
                  date: selectedCard.expired_at,
                })
              );
            } catch (err) {
              console.error(`Failed to update post ${selectedPost}:`, err);
              toast.error(t("myCards.failedToHighlightPost"));
            }
          }
        }
        toast.success(
          t("myCards.appliedCardToPost", {
            cardName: selectedCard.name,
            title: post?.title || selectedPost,
          })
        );
      } catch (err) {
        toast.error(t("myCards.failedToAssignPost"));
      }
      setShowModal(false);
      setSelectedCard(null);
      setSelectedPost(null);
    }
  }, [selectedPost, selectedCard, myCards, setMyCards, posts]);

  // Handle user selection and update user
  const handleConfirmUser = useCallback(async () => {
    if (selectedCard && selectedCard.$id && selectedUser) {
      // Prevent self-gifting
      if (selectedUser === userId) {
        toast.error(t("myCards.cannotSelfGift"));
        setShowModal(false);
        setSelectedCard(null);
        setSelectedUser(null);
        setSearchTerm("");
        setFocusedUserIndex(-1);
        return;
      }

      try {
        // Update card with recipient_id
        await updateMyCard(selectedCard.$id, { recipient_id: selectedUser });
        setMyCards(
          myCards.map((c: any) =>
            c.$id === selectedCard.$id
              ? { ...c, recipient_id: selectedUser }
              : c
          )
        );

        // Send gift notification to recipient
        const recipient = users?.find((u: any) => u.$id === selectedUser);
        const senderData = users?.find((u: any) => u.$id === userId);

        if (recipient && senderData && selectedCard) {
          const cardData = cardsData.find(
            (card: Card) => card.id === selectedCard.card_id
          );

          if (cardData) {
            const isQpGift = cardData.title.toLowerCase().includes("qp");
            const qpMatch = cardData.title.match(/(\d+)\s*qp/i);
            const qpAmount = qpMatch ? parseInt(qpMatch[1]) : undefined;

            await sendGiftNotification(
              selectedUser,
              senderData.name,
              isQpGift ? "gift with QP" : "flower bouquet",
              qpAmount
            );
          }
        }

        // Update recipient user's activatedTest
        if (recipient) {
          let recipientCardIds: string[] = [];
          if (typeof recipient.activatedTest === "string") {
            try {
              recipientCardIds = JSON.parse(recipient.activatedTest) || [];
            } catch {
              recipientCardIds = [];
            }
          } else if (Array.isArray(recipient.activatedTest)) {
            recipientCardIds = recipient.activatedTest;
          }

          if (!recipientCardIds.includes(selectedCard.id)) {
            // Award points for point-based gifts
            let points: any;
            if (selectedCard.id === "16") {
              points = "GIFT_100"; // 100 QP gift
            } else if (selectedCard.id === "17") {
              points = "GIFT_500"; // 500 QP gift
            }

            if (points) {
              await updateUserLevelAndPoints(selectedUser, points);
              toast.success(
                t("myCards.giftSentWithQP", {
                  cardName: selectedCard.name,
                  recipientName: recipient.name,
                  points: points,
                })
              );
            } else {
              toast.success(
                t("myCards.giftSentToRecipient", {
                  cardName: selectedCard.name,
                  recipientName: recipient.name,
                })
              );
            }
          } else {
            toast.success(
              t("myCards.giftAlreadyAssigned", {
                cardName: selectedCard.name,
                recipientName: recipient.name,
              })
            );
          }
        }
      } catch (err) {
        console.error(`Failed to assign gift to user ${selectedUser}:`, err);
        toast.error(t("myCards.failedToSendGift"));
      }
      setShowModal(false);
      setSelectedCard(null);
      setSelectedUser(null);
      setSearchTerm("");
      setFocusedUserIndex(-1);
    }
  }, [selectedUser, selectedCard, myCards, setMyCards, users, userId]);

  // Modified handleSelect to prevent reassignment for Gifts & Recognition
  const handleSelect = (card: Card, type: "post" | "user") => {
    if (type === "user" && card.recipient_id) {
      toast.error(t("myCards.giftRecipientLocked"));
      return;
    }
    setSelectedCard(card);
    setModalType(type);
    if (type === "post") {
      setSelectedPost(card.post_id || null);
    } else {
      setSelectedUser(card.recipient_id || null);
    }
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedCard(null);
    setSelectedPost(null);
    setSelectedUser(null);
    setModalType(null);
    setSearchTerm("");
    setFocusedUserIndex(-1);
  };

  // Calculate remaining days for PerDayPayment cards
  const getRemainingDays = useCallback((card: Card) => {
    if (card.type === "OneTimePayment" || !card.expired_at || !card.activated) {
      return null;
    }
    const expirationDate = new Date(card.expired_at);
    const now = new Date();
    const remainingMs = expirationDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  }, []);

  // Filter users based on search term
  const filteredUsers =
    users?.filter((u: any) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  // Handle keyboard navigation for user selection
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (modalType !== "user") return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedUserIndex((prev) =>
        Math.min(prev + 1, filteredUsers.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedUserIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && focusedUserIndex >= 0) {
      e.preventDefault();
      const selected = filteredUsers[focusedUserIndex];
      if (selected) {
        setSelectedUser(selected.$id);
        setShowModal(false);
        setSearchTerm("");
        setFocusedUserIndex(-1);
      }
    } else if (e.key === "Escape") {
      closeModal();
    }
  };

  // Memoize the cards grid
  const cardsGrid = useMemo(
    () => (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {myCards.map((card: any) => {
          const assignedPost = card.post_id
            ? posts.find((p) => p.$id === card.post_id)
            : null;
          const assignedUser = card.recipient_id
            ? users?.find((u: any) => u.$id === card.recipient_id)
            : null;

          return (
            <div key={card.$id || card.id} className="group">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 hover:from-gray-700 hover:to-gray-800 transition-all duration-300 border border-gray-700 hover:border-gray-600 shadow-lg hover:shadow-xl">
                <div className="text-center mb-4">
                  <img
                    className="w-20 h-20 mb-4 object-contain mx-auto"
                    src={card.symbol}
                    alt={card.name}
                  />
                  <h3 className="text-lg font-bold text-white">{card.name}</h3>
                  {card.price > 0 && (
                    <div className="text-sm text-gray-400">
                      €
                      {Array.isArray(card.price)
                        ? card.price[0].toFixed(2)
                        : card.price.toFixed(2)}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-300 text-center">
                    {card.description || t("myCards.noDescription")}
                  </p>
                </div>

                {assignedPost && card.category !== "Gifts & Recognition" && (
                  <div className="mb-4 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-lg p-3 border border-blue-500/30">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          assignedPost.imageUrl ||
                          "https://via.placeholder.com/48"
                        }
                        alt={assignedPost.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white truncate">
                          {assignedPost.title}
                        </h4>
                        <p className="text-xs text-gray-300 truncate">
                          {assignedPost.categoryName}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-blue-300">
                      ✓ {t("myCards.cardApplied")}
                    </div>
                  </div>
                )}

                {assignedUser && card.category === "Gifts & Recognition" && (
                  <div className="mb-4 bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-lg p-3 border border-green-500/30">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          assignedUser.imageUrl ||
                          "https://via.placeholder.com/48"
                        }
                        alt={assignedUser.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white truncate">
                          {assignedUser.name}
                        </h4>
                        <p className="text-xs text-gray-300 truncate">
                          {t("myCards.level", {
                            level: assignedUser.level || 1,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-green-300">
                      ✓ {t("myCards.giftSent")}
                    </div>
                  </div>
                )}

                <div className="mb-4 text-center">
                  {card.type === "OneTimePayment" ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                      {t("myCards.permanent")}
                    </span>
                  ) : card.activated ? (
                    <div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
                        {t("myCards.active")}
                      </span>
                      {getRemainingDays(card) && (
                        <div className="text-xs text-gray-400 mt-1">
                          {t("myCards.daysRemaining", {
                            count: getRemainingDays(card) ?? undefined,
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                      {t("myCards.inactive")}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {card.type !== "OneTimePayment" && (
                    <Button
                      onClick={() => activateCard(card)}
                      disabled={card.activated}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-300 ${
                        card.activated
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                      }`}
                      aria-label={
                        card.activated
                          ? `Card ${card.name} is activated`
                          : `Activate card ${card.name}`
                      }>
                      {card.activated
                        ? t("myCards.activated")
                        : t("myCards.activate")}
                    </Button>
                  )}

                  {(card.category === "Post Highlights" ||
                    card.category === "My Post Tools" ||
                    card.category === "Pinned Content") && (
                    <button
                      onClick={() => handleSelect(card, "post")}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] ${
                        assignedPost
                          ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                          : "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                      }`}
                      aria-label={
                        assignedPost
                          ? `Change post for ${card.name}`
                          : `Select post for ${card.name}`
                      }>
                      {assignedPost
                        ? t("myCards.changePost")
                        : t("myCards.selectPost")}
                    </button>
                  )}

                  {card.category === "Gifts & Recognition" && (
                    <button
                      onClick={() => handleSelect(card, "user")}
                      disabled={!!card.recipient_id}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] ${
                        card.recipient_id
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                      }`}
                      aria-label={
                        card.recipient_id
                          ? `Recipient for ${card.name} is locked`
                          : `Select recipient for ${card.name}`
                      }>
                      {card.recipient_id
                        ? t("myCards.recipientLocked")
                        : t("myCards.selectRecipient")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    ),
    [myCards, activateCard, Button, getRemainingDays, posts, users]
  );

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .modal-overlay {
          transition: opacity 0.3s ease-in-out;
        }
        .modal-content {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-in-out;
        }
      `}</style>
      <h2 className="text-3xl font-bold text-white mb-6">
        {t("myCards.title")}
      </h2>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="text-gray-400">{t("myCards.loadingCards")}</div>
        </div>
      ) : (
        <div className="animate-fadeIn">
          {error ? (
            <div className="text-center py-12">
              <div className="text-red-500">{error}</div>
            </div>
          ) : myCards.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400">
                {t("myCards.noPurchasedCards")}
              </div>
            </div>
          ) : (
            cardsGrid
          )}
        </div>
      )}

      {showModal && modalType === "post" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 modal-overlay">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[70vh] overflow-y-auto border border-gray-700 shadow-lg modal-content animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {t("myCards.selectPostFor", { cardName: selectedCard?.name })}
                </h3>
                <p className="text-sm text-gray-400">
                  {t("myCards.applyCardToPost")}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-gray-600 rounded-full"
                aria-label="Close modal">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-h-[50vh] overflow-y-auto">
              {posts.length === 0 ? (
                <div className="text-center text-gray-400 text-sm col-span-2 py-6">
                  {t("myCards.noPostsAvailable")}
                </div>
              ) : (
                posts.map((post) => (
                  <div
                    key={post.$id}
                    className={`group relative bg-gray-800 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedPost === post.$id
                        ? "ring-1 ring-blue-500"
                        : "hover:ring-1 hover:ring-gray-600"
                    }`}
                    onClick={() => setSelectedPost(post.$id)}>
                    {selectedPost === post.$id && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}

                    <div className="relative h-24 overflow-hidden">
                      <img
                        src={post.imageUrl || "https://via.placeholder.com/48"}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-full text-xs text-white">
                        {post.categoryName || t("myCards.uncategorized")}
                      </div>
                    </div>

                    <div className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                          {post.title}
                        </h4>
                        <span className="text-xs text-gray-400">
                          {post.date ||
                            new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-300 text-xs line-clamp-2">
                        {post.description || t("myCards.noDescription")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <div className="text-xs text-gray-400 truncate max-w-[50%]">
                {selectedPost
                  ? `Selected: ${
                      posts.find((p) => p.$id === selectedPost)?.title ||
                      selectedPost
                    }`
                  : t("myCards.noPostSelected")}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                  aria-label="Cancel post selection">
                  {t("myCards.cancel")}
                </button>
                <button
                  onClick={handleConfirmPost}
                  disabled={!selectedPost}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedPost
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-sm hover:shadow-md"
                      : "bg-gray-600 text-gray-400 cursor-not-allowed"
                  }`}
                  aria-label="Confirm post selection">
                  {t("myCards.confirm")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && modalType === "user" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 modal-overlay">
          <div
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[70vh] overflow-y-auto border border-gray-700 shadow-lg modal-content animate-fadeIn"
            ref={dropdownRef}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {t("myCards.selectRecipientFor", {
                    cardName: selectedCard?.name,
                  })}
                </h3>
                <p className="text-sm text-gray-400">
                  {t("myCards.sendGiftToUser")}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-gray-600 rounded-full"
                aria-label="Close modal">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t("myCards.searchUsers")}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setFocusedUserIndex(-1);
                  }}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 border border-gray-700 transition-all duration-200"
                  autoFocus
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-h-[40vh] overflow-y-auto">
              {usersLoading ? (
                <div className="text-center text-gray-400 text-sm col-span-2 py-6">
                  {t("myCards.loadingUsers")}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center text-gray-400 text-sm col-span-2 py-6">
                  {searchTerm
                    ? t("myCards.noUsersFound")
                    : t("myCards.noUsersAvailable")}
                </div>
              ) : (
                filteredUsers.map((user: any, index: number) => (
                  <div
                    key={user.$id}
                    className={`group relative bg-gray-800 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedUser === user.$id
                        ? "ring-1 ring-blue-500"
                        : "hover:ring-1 hover:ring-gray-600"
                    }`}
                    onClick={() => setSelectedUser(user.$id)}>
                    {selectedUser === user.$id && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}

                    <div className="relative h-24 overflow-hidden">
                      <img
                        src={user.imageUrl || "https://via.placeholder.com/48"}
                        alt={user.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-full text-xs text-white">
                        {t("myCards.level", { level: user.level || 1 })}
                      </div>
                    </div>

                    <div className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                          {user.name}
                        </h4>
                        <span className="text-xs text-gray-400">
                          {user.point || 0} QP
                        </span>
                      </div>
                      <p className="text-gray-300 text-xs line-clamp-2">
                        {user.bio || t("myCards.noBioAvailable")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <div className="text-xs text-gray-400 truncate max-w-[50%]">
                {selectedUser
                  ? `Selected: ${
                      users?.find((u: any) => u.$id === selectedUser)?.name ||
                      selectedUser
                    }`
                  : t("myCards.noUserSelected")}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                  aria-label="Cancel user selection">
                  {t("myCards.cancel")}
                </button>
                <button
                  onClick={handleConfirmUser}
                  disabled={!selectedUser}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedUser
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-sm hover:shadow-md"
                      : "bg-gray-600 text-gray-400 cursor-not-allowed"
                  }`}
                  aria-label="Confirm user selection">
                  {t("myCards.confirm")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCards;

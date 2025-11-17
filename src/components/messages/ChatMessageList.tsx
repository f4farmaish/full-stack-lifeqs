import { useEffect, useRef, useState } from "react";
import { appwriteConfig, client } from "@/lib/appwrite/config";
import {
  useMessages,
  useMarkMessageAsRead,
  useToggleMessageLike,
} from "@/lib/react-query/queries";
import ImageGalleryModal from "./ImageGalleryModal";
import { getUserDocumentsByIds } from "@/services/userService";
import LikeModal from "../shared/LikeModal";
import { useQueryClient } from "@tanstack/react-query";
import { Models, RealtimeResponseEvent } from "appwrite";

type Props = {
  chatId: string;
  currentUserId: string;
};

interface MessageWithDate extends Models.Document {
  showDateSeparator?: boolean;
  dateLabel?: string;
}

const ChatMessageList = ({ chatId, currentUserId }: Props) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [limit] = useState(20);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // React Query hooks
  const { data, fetchNextPage, hasNextPage, isLoading } = useMessages(
    chatId,
    limit
  );
  const { mutate: markAsRead } = useMarkMessageAsRead(chatId);
  const { mutate: toggleLike } = useToggleMessageLike(chatId);

  // Helper function to check if two dates are on the same day
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // Format date labels (Today, Yesterday, or date)
  const formatDateLabel = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(date, today)) {
      return "Today";
    } else if (isSameDay(date, yesterday)) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  };

  // Get messages from React Query data and add date separators
  const messages: MessageWithDate[] = data
    ? data.pages
        .flatMap((page) => page.documents)
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        .map((msg, index, array) => {
          const currentDate = new Date(msg.timestamp);
          const previousMsg = array[index - 1];
          const previousDate = previousMsg
            ? new Date(previousMsg.timestamp)
            : null;

          let showDateSeparator = false;
          let dateLabel = "";

          if (!previousDate || !isSameDay(currentDate, previousDate)) {
            showDateSeparator = true;
            dateLabel = formatDateLabel(currentDate);
          }

          return {
            ...msg,
            showDateSeparator,
            dateLabel,
          };
        })
    : [];

  // Mark unread messages as read on initial load
  useEffect(() => {
    if (!data) return;

    const unreadMessages = messages.filter(
      (msg) => msg.receiverId === currentUserId && msg.read === false
    );


    if (unreadMessages.length > 0) {
      unreadMessages.forEach((msg) => {
        markAsRead(msg.$id, {
          onError: (err) => {
            console.error("Failed to mark message as read:", msg.$id, err);
          },
        });
      });
    }

    // Scroll to bottom on initial load
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, [data, currentUserId, markAsRead]);

  // Handle infinite scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !hasNextPage) return;

    const handleScroll = async () => {
      if (container.scrollTop < 50 && !isLoadingMore) {
        setIsLoadingMore(true);
        await fetchNextPage();
        setIsLoadingMore(false);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasNextPage, isLoadingMore, fetchNextPage]);

  // Real-time subscription
  useEffect(() => {
    const unsubscribe = client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`,
      (response: RealtimeResponseEvent<Models.Document>) => {
        const payload = response.payload;

        // Handle new messages for any chat involving the current user
        if (
          response.events.includes(
            "databases.*.collections.*.documents.*.create"
          ) &&
          (payload.senderId === currentUserId ||
            payload.receiverId === currentUserId)
        ) {

          // Update cache for the message's chatId
          queryClient.setQueryData(
            ["messages", payload.chatId],
            (oldData: any) => {
              if (!oldData) {
                return {
                  pages: [{ documents: [{ ...payload }], total: 1 }],
                  pageParams: [0],
                };
              }

              const exists = oldData.pages.some((page: any) =>
                page.documents.some(
                  (msg: Models.Document) => msg.$id === payload.$id
                )
              );
              if (exists) {
                return oldData;
              }

              const newMessage = { ...payload };
              return {
                ...oldData,
                pages: [
                  {
                    ...oldData.pages[0],
                    documents: [
                      ...(oldData.pages[0]?.documents || []),
                      newMessage,
                    ],
                  },
                  ...oldData.pages.slice(1),
                ],
              };
            }
          );

          // Scroll and mark as read only for the active chat
          if (payload.chatId === chatId) {
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);

            if (payload.receiverId === currentUserId && !payload.read) {
              markAsRead(payload.$id, {
                onError: (err) => {
                  console.error(
                    "Failed to mark received message as read:",
                    payload.$id,
                    err
                  );
                },
              });
            }
          }
        }

        // Handle message updates (e.g., read = true, likedBy) for the active chat
        if (
          response.events.includes(
            "databases.*.collections.*.documents.*.update"
          ) &&
          payload.chatId === chatId &&
          (payload.senderId === currentUserId ||
            payload.receiverId === currentUserId)
        ) {

          queryClient.setQueryData(["messages", chatId], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                documents: page.documents.map((msg: Models.Document) =>
                  msg.$id === payload.$id ? { ...msg, ...payload } : msg
                ),
              })),
            };
          });
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [chatId, currentUserId, queryClient, markAsRead]);

  // Handle like toggle
  const handleToggleLike = (messageId: string, currentLikedBy: string[]) => {
    toggleLike(
      { messageId, userId: currentUserId, currentLikedBy, chatId },
      {
        onError: (err) => {
          console.error("Failed to toggle like:", err);
        },
      }
    );
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const [isLikeModalOpen, setIsLikeModalOpen] = useState(false);
  const [likedUsers, setLikedUsers] = useState<Models.Document[]>([]);
  const [modalImages, setModalImages] = useState<string[] | null>(null);
  const [modalStartIndex, setModalStartIndex] = useState(0);

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-2 p-4 h-full overflow-y-auto bg-dark-2 custom-scrollbar">
      {isLoading && (
        <div className="text-light-4 text-center py-4">Loading messages...</div>
      )}
      {messages.map((msg) => {
        const isCurrentUser = msg.senderId === currentUserId;

        return (
          <div key={msg.$id}>
            {/* Date Separator */}
            {msg.showDateSeparator && (
              <div className="flex items-center justify-center my-4">
                <div className="bg-dark-4 text-light-4 text-xs px-3 py-1 rounded-full">
                  {msg.dateLabel}
                </div>
              </div>
            )}

            {/* Message */}
            <div
              className={`max-w-[10xl] mx-auto space-y-4 w-full flex ${
                isCurrentUser ? "justify-end" : "justify-start"
              }`}>
              <div
                className={`flex flex-col gap-1 w-full max-w-[10xl] mx-auto ${
                  isCurrentUser ? "items-end" : "items-start"
                }`}>
                {/* Message bubble */}
                <div
                  className={`relative max-w-[80%] sm:max-w-[70%] md:max-w-[60%] px-4 py-2 rounded-2xl text-sm break-words shadow-md ${
                    isCurrentUser
                      ? "bg-primary-500 text-light-1 rounded-br-none"
                      : "bg-dark-4 text-light-2 rounded-bl-none"
                  }`}>
                  {/* Image preview */}
                  {msg.imageUrls?.length > 0 && (
                    <>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {msg.imageUrls
                          .slice(0, 4)
                          .map((url: string, index: number) => (
                            <div key={index} className="relative">
                              <img
                                src={url}
                                alt={`img-${index}`}
                                className="max-w-xs max-h-60 rounded-xl border border-dark-4 cursor-pointer"
                                onClick={() => {
                                  setModalImages(msg.imageUrls);
                                  setModalStartIndex(index);
                                }}
                              />
                              {index === 3 && msg.imageUrls.length > 4 && (
                                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center rounded-xl text-white font-bold text-lg">
                                  +{msg.imageUrls.length - 4}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>

                      {modalImages && (
                        <ImageGalleryModal
                          images={modalImages}
                          selectedIndex={modalStartIndex}
                          onClose={() => {
                            setModalImages(null);
                          }}
                        />
                      )}
                    </>
                  )}

                  {/* Text content */}
                  {(msg.content || msg.imageUrls?.length > 0) && (
                    <div className="flex items-end justify-between gap-2">
                      <span className="whitespace-pre-wrap break-words flex-1">
                        {msg.content}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-light-4 ml-2 shrink-0">
                        <span>{formatTime(msg.timestamp)}</span>
                        {isCurrentUser && msg.read && (
                          <img
                            src="/assets/icons/marks.svg"
                            alt="Read"
                            className="w-4 h-4 ml-1"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Like below the message bubble */}
                {/* For current user's messages: show static heart if liked by others */}
                {isCurrentUser && msg.likedBy?.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-light-4 mt-0 justify-end">
                    <span className="text-red-500">❤️</span>
                    <span
                      className="cursor-pointer hover:underline"
                      onClick={async () => {
                        try {
                          setIsLikeModalOpen(true);
                          const users = await getUserDocumentsByIds(
                            msg.likedBy || []
                          );
                          setLikedUsers(users);
                        } catch (error) {
                          console.error("Failed to fetch liked users:", error);
                        }
                      }}>
                      {msg.likedBy.length}
                    </span>
                  </div>
                )}
                {/* For recipient's messages: show clickable like button */}
                {!isCurrentUser && (
                  <div className="flex items-center gap-1 text-xs text-light-4 mt-0 justify-start">
                    <button
                      onClick={() =>
                        handleToggleLike(msg.$id, msg.likedBy || [])
                      }
                      className="hover:text-red-500 transition">
                      {msg.likedBy?.includes(currentUserId) ? (
                        <span>❤️</span>
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-light-4">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      )}
                    </button>
                    {msg.likedBy?.length > 0 && (
                      <span
                        className="cursor-pointer hover:underline"
                        onClick={async () => {
                          try {
                            setIsLikeModalOpen(true);
                            const users = await getUserDocumentsByIds(
                              msg.likedBy || []
                            );
                            setLikedUsers(users);
                          } catch (error) {
                            console.error(
                              "Failed to fetch liked users:",
                              error
                            );
                          }
                        }}>
                        {msg.likedBy.length}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {isLikeModalOpen && (
        <LikeModal
          isOpen={isLikeModalOpen}
          onClose={() => setIsLikeModalOpen(false)}
          likedUsers={likedUsers}
          postId=""
        />
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessageList;

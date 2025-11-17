import { useEffect, useState } from "react";
import { Models, Query } from "appwrite";
import { databases, appwriteConfig } from "@/lib/appwrite/config";
import { useUserContext } from "@/context/AuthContext";
import { client } from "@/lib/appwrite/config";
import { RealtimeResponseEvent } from "appwrite";
import { getBlockedUserIds } from "@/services/blockService";

const Conversations = ({
  onSelectUser,
  selectedUserId,
}: {
  onSelectUser: (id: string) => void;
  selectedUserId: string | null;
}) => {
  const { user } = useUserContext();
  const [conversations, setConversations] = useState<Models.Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchConversations = async () => {
    if (!user?.id) return;

    try {
      const [res, blockedUserIds] = await Promise.all([
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.chatsCollectionId,
          [Query.search("userIds", user.id)]
        ),
        getBlockedUserIds(user.id)
      ]);

      // Filter out conversations with blocked users
      const filteredConversations = res.documents.filter(chat => {
        const otherUserId = chat.userIds.find((id: string) => id !== user.id);
        return otherUserId && !blockedUserIds.includes(otherUserId);
      });

      const sorted = filteredConversations.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
      );

      setConversations(sorted);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to chat updates
    const chatUnsubscribe = client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.chatsCollectionId}.documents`,
      (response: RealtimeResponseEvent<Models.Document>) => {
        const chat = response.payload;

        if (
          response.events.includes(
            "databases.*.collections.*.documents.*.update"
          ) &&
          chat.userIds?.includes(user.id)
        ) {

          setConversations((prev) => {
            const updatedList = [...prev];
            const index = updatedList.findIndex(
              (c) => c.chatId === chat.chatId
            );

            if (index !== -1) {
              updatedList[index] = {
                ...updatedList[index],
                updatedAt: chat.updatedAt,
                lastMessage: chat.lastMessage,
                lastSenderId: chat.lastSenderId,
              };

              const updated = updatedList.splice(index, 1)[0];
              return [updated, ...updatedList];
            }

            return [chat, ...updatedList];
          });
        }
      }
    );

    return () => {
      chatUnsubscribe();
    };
  }, [user?.id]);

  const getOtherParticipantId = (userIds: string[]) =>
    userIds.find((uid) => uid !== user?.id) || "";

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    return isToday
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString();
  };

  const handleSelect = (conv: Models.Document, otherUserId: string) => {
    setSelectedChatId(conv.chatId);
    onSelectUser(otherUserId);

    const userIndex = conv.userIds.findIndex((id: string) => id === user?.id);
    const now = new Date().toISOString();

    if (userIndex !== -1) {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.chatId === conv.chatId) {
            const updatedLastSeen = [...(c.lastSeenAt || [])];
            updatedLastSeen[userIndex] = now;

            return {
              ...c,
              lastSeenAt: updatedLastSeen,
            };
          }
          return c;
        })
      );

    }
  };

  const filteredConversations = conversations.filter((conv) => {
    const userIndex = conv.userIds.findIndex((id: string) => id === user?.id);
    const otherIndex = conv.userIds.findIndex((id: string) => id !== user?.id);
    const name = conv.userNames?.[otherIndex] || "";

    const updatedAt = conv.updatedAt || conv.createdAt;
    const lastSeenAt = conv.lastSeenAt?.[userIndex];
    const unread = !lastSeenAt || new Date(updatedAt) > new Date(lastSeenAt);

    const matchesFilter = !showOnlyUnread || unread;
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="w-full bg-dark-3 flex flex-col mt-10">
      <div className="px-4 py-4 flex items-center justify-between relative">
        <h2 className="text-xl font-bold text-light-1">Discussions</h2>

        <div
          className="flex items-center justify-end px-4 py-2 bg-dark-3 rounded-xl cursor-pointer max-w-[180px] hover:bg-dark-4 transition"
          onClick={() => setShowOnlyUnread((prev) => !prev)}>
          <p className="small-medium md:base-medium text-light-2">
            {showOnlyUnread ? "Unread Only" : "All"}
          </p>
          <img
            src="/assets/icons/filter.svg"
            width={20}
            height={20}
            alt="filter"
            className="ml-2"
          />
        </div>
      </div>

      <div className="px-4 pb-2">
        <input
          type="text"
          placeholder="Search by name..."
          className="w-full bg-dark-2 text-light-1 text-sm px-3 py-2 rounded-lg border border-dark-4 focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="text-light-4 px-4 py-3 text-sm">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="text-light-4 px-4 py-3 text-sm">
            No conversations.
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const otherUserId = getOtherParticipantId(conv.userIds);
            const otherIndex = conv.userIds.findIndex(
              (id: string) => id !== user?.id
            );
            const otherName = conv.userNames?.[otherIndex] || "Unknown";
            const otherImage =
              conv.userImages?.[otherIndex] ||
              "/assets/icons/profile-placeholder.svg";

            const updatedAt = conv.updatedAt || conv.createdAt;
            const formattedDate = formatDate(updatedAt);

            const userIndex = conv.userIds.findIndex(
              (id: string) => id === user?.id
            );
            const lastSeenAt = conv.lastSeenAt?.[userIndex];

            const wasUnread =
              !lastSeenAt || new Date(updatedAt) > new Date(lastSeenAt);
            const generatedChatId =
              user?.id && otherUserId
                ? [user.id, otherUserId].sort().join("_")
                : "";
            const isSelected =
              selectedUserId === otherUserId ||
              selectedChatId === generatedChatId;

            const isUnread = wasUnread && !isSelected;

            // Format last message display
            let displayMessage = "";
            if (conv.lastMessage === "reacted to your message") {
              displayMessage = "reacted to your message";
            } else if (conv.lastMessage) {
              if (conv.lastSenderId === user?.id) {
                displayMessage = `You: ${conv.lastMessage}`;
              } else {
                displayMessage =
                  conv.lastMessage === "[Image]"
                    ? `${otherName}: sent an image`
                    : `${otherName}: ${conv.lastMessage}`;
              }
            } else {
              displayMessage = "No message yet";
            }

            return (
              <button
                key={conv.$id}
                onClick={() => handleSelect(conv, otherUserId)}
                className={`w-full px-4 py-3 text-left transition border-b border-dark-4 rounded-lg ${
                  isSelected
                    ? "bg-dark-4 text-white"
                    : isUnread
                    ? "bg-dark-2 font-bold"
                    : "hover:bg-dark-4"
                }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={otherImage}
                      alt={otherName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex flex-col">
                      <span className="text-light-1 text-sm">{otherName}</span>
                      <p
                        className={`text-sm truncate max-w-[200px] ${
                          conv.lastMessage === "reacted to your message"
                            ? "text-red-400 italic"
                            : "text-light-4"
                        }`}>
                        {displayMessage}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-light-4 whitespace-nowrap">
                      {formattedDate}
                    </span>
                    {isUnread && (
                      <span className="inline-block w-2 h-2 bg-primary-500 rounded-full" />
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Conversations;

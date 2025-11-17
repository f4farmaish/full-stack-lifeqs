import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useUserContext } from "@/context/AuthContext";
import { generateChatId } from "@/lib/utils";
import { appwriteConfig, databases, Query } from "@/lib/appwrite/config";
import ChatMessageList from "@/components/messages/ChatMessageList";
import ChatMessageInput from "@/components/messages/ChatMessageInput";
import { useIsBlocked } from "@/lib/react-query/queries";

type ChatPageProps = {
  receiverId?: string;
};

const ChatPage = ({ receiverId }: ChatPageProps) => {
  const { userId: userIdFromParams } = useParams();
  const { user } = useUserContext();

  const finalReceiverId = receiverId || userIdFromParams;
  const [chatHeader, setChatHeader] = useState<{
    name: string;
    imageUrl: string;
  } | null>(null);

  const chatId =
    user?.id && finalReceiverId ? generateChatId(user.id, finalReceiverId) : "";

  // Check if either user has blocked the other
  const { data: userBlockedReceiver } = useIsBlocked(
    user?.id || "",
    finalReceiverId || ""
  );
  const { data: receiverBlockedUser } = useIsBlocked(
    finalReceiverId || "",
    user?.id || ""
  );

  const isBlocked = userBlockedReceiver || receiverBlockedUser;

  useEffect(() => {
    const fetchHeaderInfo = async () => {
      if (!chatId || !user?.id || !finalReceiverId) return;

      try {
        const chatRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.chatsCollectionId,
          [Query.equal("chatId", chatId)]
        );

        const chat = chatRes.documents[0];

        if (chat) {
          //  Set header from chat data
          const otherIndex = chat.userIds.findIndex(
            (id: string) => id !== user.id
          );
          const name = chat.userNames?.[otherIndex] || "Unknown";
          const imageUrl = chat.userImages?.[otherIndex] || "";
          setChatHeader({ name, imageUrl });

          //  Update lastSeenAt for this user
          const userIndex = chat.userIds.findIndex(
            (id: string) => id === user.id
          );
          if (userIndex !== -1) {
            const updatedLastSeen = [...(chat.lastSeenAt || [])];
            updatedLastSeen[userIndex] = new Date().toISOString();

            await databases.updateDocument(
              appwriteConfig.databaseId,
              appwriteConfig.chatsCollectionId,
              chat.$id,
              { lastSeenAt: updatedLastSeen }
            );

          }
        } else {
          //  Header fallback if chat doesn't exist yet
          const receiverRes = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [Query.equal("$id", finalReceiverId)]
          );

          const receiver = receiverRes.documents[0];
          if (receiver) {
            const name = receiver.name || "Unknown";
            const imageUrl = receiver.imageUrl || "";
            setChatHeader({ name, imageUrl });
          } else {
          }
        }
      } catch (error) {
        console.error(
          "Failed to fetch chat header or update lastSeenAt:",
          error
        );
      }
    };

    fetchHeaderInfo();
  }, [chatId, user?.id, finalReceiverId]);

  if (!finalReceiverId || !user?.id) {
    return (
      <div className="text-center mt-10 text-red text-lg">Invalid chat</div>
    );
  }

  // Show blocked message if either user has blocked the other
  if (isBlocked) {
    return (
      <div className="flex flex-col w-full h-[calc(100vh-80px)] bg-dark-3 mt-10">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-dark-4 bg-dark-3">
          {chatHeader?.imageUrl ? (
            <img
              src={chatHeader.imageUrl}
              alt={chatHeader.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-dark-4" />
          )}
          <div className="text-light-1">
            <a
              href={`/profile/${finalReceiverId}`}
              className="text-base sm:text-lg font-semibold  transition">
              {chatHeader?.name || "Loading..."}
            </a>
          </div>
        </div>

        {/* Blocked message */}
        <div className="flex flex-col items-center justify-center flex-1 p-6">
          <div className="w-16 h-16 rounded-full bg-dark-4 flex items-center justify-center mb-4">
            <img src="/assets/icons/blocked.svg" alt="blocked" className="w-8 h-8" />
          </div>
          <h3 className="text-light-1 text-lg font-semibold mb-2">
            You can't message this user
          </h3>
          <p className="text-light-3 text-center max-w-sm">
            {userBlockedReceiver 
              ? "You have blocked this user. Unblock them to send messages."
              : "This user has blocked you and cannot receive your messages."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-[calc(100vh-80px)] bg-dark-3 mt-10">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-dark-4 bg-dark-3">
        {chatHeader?.imageUrl ? (
          <img
            src={chatHeader.imageUrl}
            alt={chatHeader.name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-dark-4" />
        )}
        <div className="text-light-1">
          <a
            href={`/profile/${finalReceiverId}`}
            className="text-base sm:text-lg font-semibold  transition">
            {chatHeader?.name || "Loading..."}
          </a>
        </div>
      </div>

      {/* Messages */}
      <div className="flex flex-col justify-between flex-1 overflow-hidden">
        <div className="flex-1 h-0 min-h-0 overflow-hidden">
          <ChatMessageList chatId={chatId} currentUserId={user.id} />
        </div>

        <div className="border-t border-dark-4 bg-dark-2 px-3 py-2 sm:px-4 sm:py-3">
          <ChatMessageInput senderId={user.id} receiverId={finalReceiverId} />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

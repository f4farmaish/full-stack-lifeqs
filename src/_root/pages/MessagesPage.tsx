import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import ChatPage from "./ChatPage";
import Conversations from "@/components/messages/Conversations";
import { Button } from "@/components/ui";
import { MessagesPageState } from "@/types";
import { useTranslation } from "react-i18next";

const MessagesPage = () => {
  const { t } = useTranslation();
  const { state } = useLocation();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    (state as MessagesPageState)?.selectedUserId ?? null
  );

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const showConversations = !selectedUserId || !isMobile;
  const showChat = !!selectedUserId;

  // Handle navigation state
  useEffect(() => {
    if (state && (state as MessagesPageState).selectedUserId !== undefined) {
      const userId = (state as MessagesPageState).selectedUserId ?? null;
      setSelectedUserId(userId);
    }
  }, [state]);

  // Handle Escape key to clear selected conversation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedUserId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="flex flex-col sm:flex-row w-full bg-dark-3 overflow-hidden h-[100dvh] sm:h-auto rounded-lg">
      {/* Mobile / Desktop: Show conversations list only when no chat is selected (mobile) or always (desktop) */}
      {showConversations && (
        <div className="w-full sm:max-w-sm border-b sm:border-b-0 sm:border-r border-dark-4 h-[50vh] sm:h-full overflow-y-auto custom-scrollbar">
          <Conversations
            onSelectUser={setSelectedUserId}
            selectedUserId={selectedUserId}
          />
        </div>
      )}

      {/* Chat window or placeholder */}
      {showChat ? (
        <div className="flex-1 h-full flex flex-col">
          {/* Back button for mobile only */}
          <div className="sm:hidden px-4 py-2 border-b border-dark-4 bg-dark-3">
            <Button
              onClick={() => {
                setSelectedUserId(null);
              }}
              variant="ghost"
              className="shad-button_ghost back-button">
              <img
                src="/assets/icons/back.svg"
                alt="back"
                width={24}
                height={24}
              />
              <p className="small-medium lg:base-medium">{t("messagesPage.back")}</p>
            </Button>
          </div>

          <div className="flex-1 h-full">
            <ChatPage receiverId={selectedUserId!} />
          </div>
        </div>
      ) : (
        <div className="flex-1 h-full flex flex-col items-center justify-center bg-dark-3">
          <img
            src="/assets/images/lifeqss.png"
            alt="LifeQs logo"
            className="h-10 mb-4"
          />
          <p className="text-light-3 text-lg">{t("messagesPage.sendReceiveMessages")}</p>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
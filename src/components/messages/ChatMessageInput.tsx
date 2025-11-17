import { useRef, useState, useEffect } from "react";
import { sendMessage } from "@/hooks/useSendMessage";
import { uploadChatImage } from "@/services/messageService";
import Loader from "../shared/Loader";
import { useTranslation } from "react-i18next";

type Props = {
  senderId: string;
  receiverId: string;
};

const emojiList = ["😀", "😅", "😍", "🎉", "❤️", "👍", "😂", "😎", "😭", "🔥"];

const ChatMessageInput = ({ senderId, receiverId }: Props) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const MAX_CHARACTER_LIMIT = 2000;
  const characterCount = message.length;
  const isOverLimit = characterCount > MAX_CHARACTER_LIMIT;

  const handleSend = async () => {
    if (
      isUploading ||
      (!message.trim() && imageFiles.length === 0) ||
      isOverLimit
    )
      return;

    try {
      setIsUploading(true);
      const uploadedUrls: string[] = [];

      for (const file of imageFiles) {
        const url = await uploadChatImage(file);
        uploadedUrls.push(url);
      }


      await sendMessage({
        senderId,
        receiverId,
        content: message,
        imageUrls: uploadedUrls,
      });

      setMessage("");
      setImagePreviews([]);
      setImageFiles([]);
      setShowEmojiPicker(false);
      setIsUploading(false);
    } catch (error) {
      console.error("Failed to send message with images:", error);
      setIsUploading(false);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setMessage((prev) => prev + emoji);
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  };

  useEffect(() => {
    autoResize();
  }, [message]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    const totalImages = imageFiles.length + files.length;
    if (totalImages > 10) {
      console.warn("Cannot upload more than 10 images");
      return;
    }

    const newPreviews = files.map((file) => URL.createObjectURL(file));

    setImagePreviews((prev) => [...prev, ...newPreviews]);
    setImageFiles((prev) => [...prev, ...files]);

  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative bg-dark-3 px-4 py-3 border-t border-dark-4 w-full rounded-xl">
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-4 bg-dark-4 p-3 rounded-xl shadow-lg flex flex-wrap gap-2 z-20 max-w-xs">
          {emojiList.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className="text-2xl hover:scale-125 transition-transform">
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col bg-dark-4 rounded-xl px-3 py-2 border border-dark-4 focus-within:ring-1 focus-within:ring-primary-500 transition w-full">
          {imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="h-12 w-auto rounded-md border border-dark-4"
                  />
                  <button
                    onClick={() => {
                      const newPreviews = [...imagePreviews];
                      const newFiles = [...imageFiles];
                      newPreviews.splice(index, 1);
                      newFiles.splice(index, 1);
                      setImagePreviews(newPreviews);
                      setImageFiles(newFiles);
                    }}
                    className="absolute bg-dark-4 -top-2 -right-2 text-light-3 text-xs rounded-full w-5 h-5 flex items-center justify-center hover:text-red-500">
                    X
                  </button>

                  {isUploading && index === imagePreviews.length - 1 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
                      <Loader />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder={t("chatMessageInput.placeholder")}
              className="flex-1 resize-none bg-transparent text-light-1 placeholder-light-4 text-sm focus:outline-none overflow-y-auto max-h-40 scrollbar-thin scrollbar-thumb-light-4 scrollbar-track-dark-3"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
            />

            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="w-6 h-5">
              <img
                src="/assets/icons/emoji.svg"
                alt="emoji"
                className="w-full h-full object-contain"
              />
            </button>

            <label className="w-6 h-5 cursor-pointer">
              <img
                src="/assets/icons/attachment.svg"
                alt="upload"
                className="w-full h-full object-contain"
              />
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex justify-between items-center mt-2">
            <div
              className={`text-xs ${
                isOverLimit
                  ? "text-red-500"
                  : characterCount > MAX_CHARACTER_LIMIT * 0.8
                  ? "text-yellow-500"
                  : "text-light-4"
              }`}>
              {characterCount}/{MAX_CHARACTER_LIMIT}
            </div>
            {isOverLimit && (
              <div className="text-xs text-red-500">{t("chatMessageInput.messageTooLong")}</div>
            )}
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={
            isUploading ||
            (!message.trim() && imageFiles.length === 0) ||
            isOverLimit
          }
          className={`p-3 rounded-xl transition flex items-center justify-center ${
            isUploading ||
            (!message.trim() && imageFiles.length === 0) ||
            isOverLimit
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-primary-500 hover:bg-primary-600 text-white"
          }`}>
          <svg
            className="w-5 h-5 rotate-90"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatMessageInput;

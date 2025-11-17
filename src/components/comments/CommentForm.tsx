import { useRef, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUserContext } from "@/context/AuthContext";
import { useCreateComment, useGetCommentsByPostId, useSearchUsersByPrefix } from "@/lib/react-query/queries";
import { useToast } from "@/components/ui/use-toast";
import { updateUserLevelAndPoints } from "@/services/userService";
import { UserAction } from "@/lib/pointsMapping";
import { UserDetails } from "@/types";
import MultiFileUploader from "./MultiFileUploader";
import RichTextEditor from "./RichTextEditor";

interface CommentFormProps {
  id: string; // ID of the post or poll
  isPoll?: boolean; // Indicates if it's for a poll
  parentCommentId?: string; // ID of the parent comment for replies
  onReplySuccess?: () => void; // Callback for successful reply submission
  disabled?: boolean; // Indicates if the form is disabled (comments locked)
  parentUserName?: string;
  parentUserId?: string;
}

const CommentForm: React.FC<CommentFormProps> = ({
  id,
  isPoll = false,
  parentCommentId,
  onReplySuccess,
  disabled = false,
  parentUserName,
  parentUserId,
}) => {
  const { user } = useUserContext();
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [currentPrefix, setCurrentPrefix] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [didAutoMention, setDidAutoMention] = useState(false);
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const editorRef = useRef<{ getEditor: () => any } | null>(null);
  const queryClient = useQueryClient();
  const { mutate: createComment, isLoading } = useCreateComment();
  const { toast } = useToast();
  const { data: commentsData } = useGetCommentsByPostId(id, isPoll);
  const { data: suggestedUsers, isLoading: isSearching } = useSearchUsersByPrefix(currentPrefix);

  useEffect(() => {
    if (parentCommentId && parentUserName && content === "" && !didAutoMention) {
      const initialContent = `<p>@${parentUserName} </p>`;
      setContent(initialContent);
      setDidAutoMention(true);
      if (parentUserId && parentUserName !== "Anonymous") {
        setMentionedUserIds([parentUserId]);
      }
      setTimeout(() => {
        if (editorRef.current) {
          const quill = editorRef.current.getEditor();
          if (quill) {
            quill.focus();
            const textLength = quill.getLength() - 1;
            quill.setSelection(textLength, 0);
          } else {
            console.error("Failed to get Quill editor instance in useEffect");
          }
        } else {
          console.error("Editor ref not initialized in useEffect");
        }
      }, 100); // Increased delay to ensure editor is mounted
    }
  }, [parentCommentId, parentUserName, parentUserId, content, didAutoMention]);

  const handleChange = (value: string, delta: any, source: string, editor: any) => {
    setContent(value);
    if (source !== "user") return;
    const cursorPosition = editor.getSelection()?.index;
    if (cursorPosition == null) return;
    const textBeforeCursor = editor.getText(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const prefix = textBeforeCursor.substring(lastAtIndex + 1);
      const nextChar = editor.getText(cursorPosition, 1);
      const isSpaceAfter = nextChar === " " || nextChar === "\n" || nextChar === "";
      if (prefix.match(/^[\w\s]*$/) && isSpaceAfter) {
        setCurrentPrefix(prefix);
        setMentionStartIndex(lastAtIndex);
      } else {
        setCurrentPrefix(null);
        setMentionStartIndex(null);
      }
    } else {
      setCurrentPrefix(null);
      setMentionStartIndex(null);
    }
  };

  const insertMention = (username: string, userId: string) => {
    if (!editorRef.current) {
      console.error("Editor ref not initialized for insertMention");
      return;
    }
    const quill = editorRef.current.getEditor();
    if (!quill || mentionStartIndex === null || currentPrefix === null) {
      console.error("Quill editor or mention data not available");
      return;
    }
    const start = mentionStartIndex;
    const deleteLen = currentPrefix.length;
    quill.deleteText(start + 1, deleteLen);
    quill.insertText(start + 1, `${username} `);
    const newCursor = start + 1 + username.length + 1;
    quill.setSelection(newCursor, 0);
    setMentionedUserIds((prev) => {
      if (!prev.includes(userId)) {
        return [...prev, userId];
      }
      return prev;
    });
    setCurrentPrefix(null);
    setMentionStartIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editorRef.current) {
      console.error("Editor ref not initialized in handleSubmit");
      toast({ description: "Error: Editor not initialized. Please try again." });
      return;
    }

    const quill = editorRef.current.getEditor();
    if (!quill) {
      console.error("Quill editor instance not found");
      toast({ description: "Error: Editor not initialized. Please try again." });
      return;
    }

    const plainContent = quill.getText().trim();
    if (!plainContent || disabled || isLoading) {
      if (!plainContent) {
        toast({ description: "Comment cannot be empty." });
      } else if (disabled) {
        toast({ description: "Comments are currently locked." });
      } else if (isLoading) {
        toast({ description: "Submission in progress, please wait." });
      }
      return;
    }

    const userImageUrl = isAnonymous
      ? "https://via.placeholder.com/40x40/666/fff?text=A"
      : user.imageUrl;

    const userComments = commentsData?.pages?.flatMap((page) => page.documents) || [];
    const hasCommented = userComments.some((comment) => comment.userIdString === user.id);

    const commentData = {
      postId: id,
      userId: user.id,
      userName: isAnonymous ? "Anonymous" : user.name,
      userImageUrl,
      content,
      isAnonymous,
      isPoll,
      parentCommentId,
      mentionedUserIds,
      imageFiles: commentFiles,
    };


    createComment(commentData, {
      onSuccess: async () => {
        setContent("");
        setMentionedUserIds([]);
        setDidAutoMention(false); // Reset for future replies
        setCommentFiles([]);
        queryClient.invalidateQueries(["comments", id]);

        if (!hasCommented) {
          const updatedUser = await updateUserLevelAndPoints(
            user.id,
            UserAction.COMMENT_ON_POST
          );
          if (updatedUser) {
            toast({
              description: "Thank you for making a comment! You've received 3 points",
            });
          }
        } else {
          toast({
            description: "Comment posted successfully.",
          });
        }

        if (parentCommentId && onReplySuccess) {
          onReplySuccess();
        }
      },
      onError: (error) => {
        console.error("[CommentForm] Error creating comment:", error); // Debug: Log error details
        toast({ description: "Failed to post comment. Please try again." });
      },
    });
  };

  return (
    <div className="relative">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 bg-gradient-to-b from-dark-3/80 via-dark-4/80 to-dark-3/80 backdrop-blur-md rounded-xl px-4 py-4 shadow-2xl w-full border border-primary-500/10 transition-all duration-500 hover:shadow-primary-500/10 hover:border-primary-500/20"
      >
        <div
          className={`w-full bg-dark-2/30 text-light-1 text-sm border border-primary-500/40 rounded-lg focus-within:ring-2 focus-within:ring-primary-600/30 focus-within:border-primary-500/40 transition-all duration-300 ease-out hover:border-primary-500/20 ${
            disabled ? "opacity-40 cursor-not-allowed" : ""
          }`}
        >
          <RichTextEditor
            value={content}
            onChange={handleChange}
            placeholder={disabled ? "Comments are locked" : "Write a comment..."}
            disabled={disabled || isLoading}
            maxLength={2000}
            showCounter={true}
            editorRef={editorRef} // Pass ref to RichTextEditor
          />
          {!parentCommentId && !disabled && commentFiles.length > 0 && (
            <div className="px-3 pb-3">
              <MultiFileUploader
                fieldChange={setCommentFiles}
                mediaUrls={[]}
                value={commentFiles}
                showUploadButton={false}
                showPreviews={true}
              />
            </div>
          )}
        </div>
        <div className="flex justify-between items-center">
          <label className="flex items-center gap-2 text-sm text-light-4 font-medium cursor-pointer group transition-all duration-300 hover:text-light-2">
            <div
              className={`relative w-4 h-4 rounded border-2 transition-all duration-300 ease-out group-hover:border-primary-500/80 ${
                isAnonymous
                  ? "bg-primary-500 border-primary-500 shadow-lg shadow-primary-500/20"
                  : disabled
                  ? "border-light-3 bg-dark-2"
                  : "border-light-3 bg-dark-2 hover:border-primary-500/50"
              }`}
            >
              {isAnonymous && !disabled && (
                <svg
                  className="absolute inset-0 w-3 h-3 text-dark-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={() => setIsAnonymous(!isAnonymous)}
              className="sr-only"
              disabled={disabled || isLoading}
            />
            Post anonymously
          </label>
          <div className="flex items-center gap-4">
            {!parentCommentId && !disabled && (
              <MultiFileUploader
                fieldChange={setCommentFiles}
                mediaUrls={[]}
                value={commentFiles}
                showPreviews={false}
                showUploadButton={true}
              />
            )}
            <button
              type="submit"
              className={`group relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-r from-primary-500/90 to-primary-600/90 shadow-lg shadow-primary-500/20 transition-all duration-500 ease-out hover:from-primary-600 hover:to-primary-700 hover:shadow-primary-500/40 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500/30 ${
                disabled || isLoading ? "opacity-30 cursor-not-allowed bg-dark-5" : ""
              }`}
              disabled={disabled || isLoading}
            >
              <span className="text-black dark:text-white text-lg font-bold group-hover:translate-x-1 transition-transform duration-300">
                {">"}
              </span>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-black/30 to-black/30 dark:from-primary-500/20 dark:to-primary-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"></div>
            </button>
          </div>
        </div>
      </form>
      {currentPrefix && (
        <div className="absolute top-full left-0 mt-2 w-full bg-gradient-to-b from-dark-3/95 to-dark-4/95 rounded-lg shadow-2xl z-20 max-h-40 overflow-y-auto border border-primary-500/10 backdrop-blur-md animate-slide-down">
          {isSearching ? (
            <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-light-4">
              <div className="w-3.5 h-3.5 border-2 border-primary-500/70 border-t-transparent rounded-full animate-spin"></div>
              <span className="font-inter">Searching...</span>
            </div>
          ) : suggestedUsers && suggestedUsers.documents && suggestedUsers.documents.length > 0 ? (
            (suggestedUsers.documents as UserDetails[]).map((user) => (
              <div
                key={user.$id}
                className="group flex items-center gap-2.5 px-3 py-2.5 text-sm text-light-2 cursor-pointer transition-all duration-300 hover:bg-primary-500/5 hover:pl-4 hover:text-light-1 first:rounded-t-lg last:rounded-b-lg hover:border-r-2 hover:border-primary-500/30"
                onClick={() => insertMention(user.name, user.$id)}
              >
                <div className="relative">
                  <img
                    src={user.imageUrl || "/assets/icons/profile-placeholder.svg"}
                    alt={`${user.name}'s profile`}
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-primary-500/20 group-hover:ring-primary-500/40 transition-all duration-300"
                  />
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary-500/20 to-primary-600/20 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <span className="font-inter font-medium truncate">{user.name}</span>
              </div>
            ))
          ) : (
            <p className="px-3 py-2.5 text-sm text-light-4 text-center font-inter">No users found</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentForm;
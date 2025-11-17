import { Models } from "appwrite";

export type INavLink = {
  imgURL: string;
  route: string;
  label: string;
};

export interface GridPostListProps {
  items?: (Models.Document & {
    type: "post" | "poll";
    isDraft?: boolean;
    creatorId?: string | Models.Document;
    creator?: string | Models.Document;
    creatorName?: string;
    creatorImageUrl?: string;
    groupId?: string | Models.Document;
    groupIdString?: string;
    groupName?: string;
    categoryId?: string | Models.Document;
    categoryIdString?: string;
    categoryName?: string;
    subCategory?: string;
    title?: string;
    question?: string;
    imageUrl?: string;
    isAnonymous?: boolean;
    isInMainPage?: boolean;
    isInCategoryPage?: boolean;
    isInSubcategoryPage?: boolean;
    edits?: string[];
    gender?: string;
  })[];
  showUser?: boolean;
  showStats?: boolean;
  onCategoryClick?: (categoryId: string, subCategory?: string) => void;
  groupId?: string;
  includeGroupItems?: boolean;
  selectedCategoryId?: string | null;
  subCategories?: string[] | null;
  filterFrom?: string | undefined;
  isSavedSection?: boolean;
  layout?: "grid" | "list";
}

export interface UserDetails extends Models.Document {
  id: string; // Added to match Appwrite Users collection $id
  name: string;
  accountId: string;
  email: string;
  bio?: string;
  imageId?: string;
  imageUrl?: string;
  gender?: "M" | "F" | string;
  dateOfBirth?: string;
  point?: number;
  lastBirthdayBonusAwarded?: string;
  specialBonusesAwarded?: string[];
  lastQuestionReset?: string;
  questionsAskedToday?: number;
  level?: number;
  lastLoginDate?: string;
  lastGreatReset?: string;
  isOnline?: boolean;
  lastActive?: string;
  greatsToday?: number;
  activatedTest?: string[];
  isBusiness?: boolean;
  relationshipStatus?: string;
  occupation?: string;
  educationLevel?: string;
  suspended?: boolean;
  suspensionTimestamp?: string;
  walletBalance?: number;
  commentSortBy?: string;
  notificationPreferences?: string[];
  greatCommentNumber?: number;
  greatQuestionsNumber?: number;
  repliesNumber?: number;
  likeNumber?: number;
  NumberQuestionsAsked?: number;
  numberPoll?: number;
  totalLikes?: number;
  LoggedInCount?: number;
  emailPreferences?: string[];
  firstName: string;
  lastName: string;
  isReaction?: boolean; // Added to match Appwrite Users collection
  expirationDateIsReaction?: string; // Added to match Appwrite Users collection
}

export interface Card {
  id: string;
  post_id?: string;
  category: string;
  type: string;
  name: string;
  level: string;
  symbol: string;
  description: string;
  price?: number | number[];
  duration?: string | number;
  dayNumber?: number[];
  expired_at?: string;
  activated?: boolean;
  postCount?: number;
  recipient_id?: string;
}

export interface ITransactionHistory {
  date: string;
  type: string;
  amount: number;
  status: string;
  items?: string[];
}

export type IUpdateUser = {
  greatCommentNumber?: number;
  userId: string;
  name?: string;
  bio?: string;
  imageId?: string;
  imageUrl?: URL | string;
  file?: File[];
  dateOfBirth?: string;
  gender?: "F" | "M";
  relationshipStatus?: string;
  occupation?: string;
  educationLevel?: string;
  notificationPreferences?: INotificationPreferences;
  emailPreferences?: INotificationPreferences;
  lastPostDate?: string;
  postsToday?: string;
  firstName?: string;
  lastName?: string;
};

export interface Post extends Models.Document {
  creator?: { $id: string; name: string; imageUrl?: string };
  creatorId?: string;
  groupIdString?: string;
  groupId?: { $id: string };
  categoryId?: string | { $id: string };
  isAnonymous?: boolean;
  gender?: string;
  location?: string;
  imageUrl?: string;
  imageId?: string;
  title?: string;
  description?: string;
  tags?: string[];
  subCategory?: string;
  greatBy?: string[];
  greatCount?: number;
  edits?: string[];
  $createdAt: string;
  commentsLocked?: boolean;
  lockExpiry?: string | null;
  lockedBy?: string;
  superLikedBy?: string[];
  superLikeCount?: number;
  simpleLikedBy?: string[];
  simpleLikeCount?: number;
  isInMainPage?: boolean;
  expirationDateMainPage?: string;
  isInCategoryPage?: boolean;
  expirationDateCategoryPage?: string;
  isInSubcategoryPage?: boolean;
  expirationDateSubcategoryPage?: string;
  isDraft?: boolean;
}

export interface ISave extends Models.Document {
  userId: string;
  postId: string | null;
  pollId: string | null;
  isPoll: boolean;
}

export type SavedContent = Post | IPoll;

export type INewPost = {
  $id: string;
  userId: string;
  title: string;
  creator: string;
  description?: string;
  imageId?: string;
  groupId?: string | { $id: string } | null;
  imageUrl?: string | URL;
  file?: File[];
  categoryId: string;
  categoryIdString?: string;
  categoryName?: string;
  subCategory: string;
  tags?: string;
  isAnonymous?: boolean;
  groupName?: string;
  commentsLocked?: boolean;
  lockExpiry?: string | null;
  isDraft?: boolean;
  createdAt: string;
};

export type IUpdatePost = {
  postId: string;
  title: string;
  description?: string;
  imageId?: string;
  groupId?: string | { $id: string } | null;
  imageUrl?: string | URL;
  file?: File[];
  categoryId: string;
  categoryIdString?: string;
  categoryName?: string;
  subCategory: string;
  tags?: string;
  groupName?: string;
  commentsLocked?: boolean;
  lockExpiry?: string | null;
  isDraft?: boolean;
  createdAt: string;
};

export interface IUser extends Models.Document {
  lastLikeReset?: string;
  id: string;
  name: string;
  email: string;
  imageUrl: string;
  imageId?: string;
  bio: string;
  highlightsToday?: number;
  dateOfBirth?: string;
  gender?: "F" | "M";
  lastQuestionReset: string;
  point: number;
  questionsAskedToday: number;
  level: number;
  greatsToday: number;
  lastGreatReset?: string;
  reactionsOnPostsToday?: number;
  postsToday?: number;
  relationshipStatus: string;
  occupation: string;
  educationLevel: string;
  notificationPreferences?: INotificationPreferences;
  emailPreferences?: INotificationPreferences;
  likesToday?: any;
  superLikesToday?: string;
  simpleLikesToday?: string;
  lastPostDate?: string;
  firstName: string;
  lastName: string;
  isReaction?: boolean;
  expirationDateIsReaction?: string;
}

export interface INewUser {
  name: string;
  email: string;
  password: string;
  dateOfBirth: string;
  gender: "F" | "M";
  relationshipStatus: string;
  occupation: string;
  educationLevel: string;
  firstName: string;
  lastName: string;
}

export type ICategory = {
  $id: string;
  name: string;
  subCategories: string[];
  name_en: string;
  name_lat: string;
  subcategories_en: string[];
  subcategories_lat: string[];
  icon?: JSX.Element;
};

export interface CommentData {
  postId: string;
  userId: string;
  userName: string;
  userImageUrl: string;
  content: string;
  isAnonymous: boolean;
  isPoll?: boolean;
  parentCommentId?: string | null;
  mentionedUserIds: string[];
  groupId?: string | null;
  commentsLocked?: boolean;
  lockExpiry?: string | null;
  lockedBy?: string;
  imageFiles?: File[];
  imageUrls?: string[];
  imageIds?: string[];
}

export interface CommentListProps {
  id: string;
  isPoll?: boolean;
  postCreatorId?: string;
  currentUserId?: string;
  disabled?: boolean;
  groupId?: string | null;
}

export interface IComment extends Models.Document {
  postId: string;
  userId: string;
  userName: string;
  userImageUrl: string;
  content: string;
  $createdAt: string;
  isAnonymous: boolean;
  isPoll?: boolean;
  parentCommentId?: string | null;
  likes?: string[];
  groupId?: string | null;
  mentionedUserIds: string[];
  isLocked?: boolean;
  lockedBy?: string;
  hasBestFlair?: boolean;
  userIdString: string;
  replyCount?: number;
  imageUrls?: string[];
  imageIds?: string[];
}

export type IGroup = {
  memberNames: any;
  memberImages: any;
  imageUrl: any;
  categoryName: string;
  $id: string;
  name: string;
  description: string;
  categoryId: string | { $id: string; name: string };
  subCategory: string;
  tags?: string[];
  creatorId: string;
  createdAt: string;
  memberIds: string[];
  admins: string[];
  lastActivityTimestamp?: string;
  memberCount: number;
};

export interface IPoll extends Models.Document {
  type: "poll";
  $id: string;
  $createdAt: string;
  $collectionId: string;
  $databaseId: string;
  $updatedAt: string;
  $permissions: string[];
  question: string;
  createdAt: string;
  subCategory: string;
  allowMultipleAnswers: boolean;
  creatorId: string;
  creator: string;
  creatorName: string;
  creatorImageUrl: string;
  durationInDays?: number;
  totalVotes: number;
  likes?: string[];
  saves?: string[];
  categoryId: string;
  categoryIdString: string;
  categoryName: string;
  groupId?: { $id: string } | null;
  groupIdString: string;
  groupName: string;
  imageId?: string;
  imageUrl?: string | null;
  description?: string | null;
  isAnonymous: boolean;
  likedBy?: string[];
  options: IPollOption[];
  votedUsers: string[];
  simpleLikedBy?: string[];
  superLikedBy?: string[];
  commentsLocked?: boolean;
  lockExpiry?: string | null;
  lockedBy?: string[];
  superLikeCount?: number;
  simpleLikeCount?: number;
  greatBy?: string[];
  greatCount?: number;
}

export type IPollOption = {
  $id: string;
  optionText: string;
  voteCount: number;
  pollId: string;
  imageUrl?: string | null;
};

export type IVote = {
  $id: string;
  pollId: string;
  optionId: string;
  userId: string;
};

export type IMembershipRequest = {
  $id: string;
  groupId: string;
  userId: string;
  status: "pending" | "accepted" | "rejected";
  $createdAt: string;
};

export type INotificationType =
  | "LIKE_POST"
  | "COMMENT_POST"
  | "POLL_RESULTS"
  | "PARTIAL_RESULTS"
  | "LIKE_COMMENT_OWNER"
  | "LIKE_COMMENT_MEMBER"
  | "REPLY_TO_COMMENT"
  | "NEW_MEMBERSHIP_REQUEST"
  | "INACTIVE_GROUP"
  | "MEMBERSHIP_REQUEST_APPROVED"
  | "GROUP_DELETION_WARNING"
  | "GROUP_INVITATION"
  | "MENTION_IN_COMMENT"
  | "SUPER_LIKE_POST"
  | "SIMPLE_LIKE_POST"
  | "GREAT_POST"
  | "SUPER_LIKE_POLL"
  | "SIMPLE_LIKE_POLL"
  | "GREAT_POLL"
  | "BEST_COMMENT_SELECTED"
  | "LEVEL_UP"
  | "LEVEL_DOWN"
  | "NEW_BADGE_RECEIVED"
  | "GIFT_RECEIVED"
  | "GROUP_ADMIN_PROMOTION";

export interface INotification extends Models.Document {
  userId: string;
  type: INotificationType;
  message: string;
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface MinimalUser {
  $id: string;
  name: string;
  imageUrl?: string;
}
export interface IGroupInvitation extends Models.Document {
  inviteeId: string;
  groupId: string;
  inviterId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

export type INotificationPreferences = string[];

export const DEFAULT_NOTIFICATION_PREFERENCES: INotificationPreferences = [
  "LIKE_POST",
  "COMMENT_POST",
  "POLL_RESULTS",
  "PARTIAL_RESULTS",
  "LIKE_COMMENT_OWNER",
  "LIKE_COMMENT_MEMBER",
  "REPLY_TO_COMMENT",
  "BEST_COMMENT_SELECTED",
  "NEW_MEMBERSHIP_REQUEST",
  "INACTIVE_GROUP",
  "MEMBERSHIP_REQUEST_APPROVED",
  "GROUP_DELETION_WARNING",
  "GROUP_INVITATION",
  "MENTION_IN_COMMENT",
];

export const DEFAULT_EMAIL_PREFERENCES: INotificationPreferences = [
  "INACTIVE_GROUP",
  "GROUP_DELETION_WARNING",
];

export interface IChatMessage {
  $id: string;
  senderId: string;
  receiverId: string;
  content: string;
  chatId: string;
  timestamp: string;
  read: boolean;
  imageUrls?: string[];
  likedBy?: string[];
}

export interface GroupContent {
  $id: string;
  type: "post" | "poll";
  title?: string;
  question?: string;
  creatorId: string;
  creatorName: string;
  creatorImageUrl?: string;
  isAnonymous: boolean;
  groupIdString: string;
  groupName: string;
  categoryIdString: string;
  categoryName: string;
  subCategory?: string;
  imageUrl?: string;
  createdAt: string;
  likedBy: string[];
  allowMultipleAnswers?: boolean;
  durationInDays?: number;
  totalVotes?: number;
  commentsLocked?: boolean;
  lockExpiry?: string | null;
  lockedBy?: string;
  tags: string[];
  [key: string]: any;
}

export interface SavedItem extends Models.Document {
  type: "post" | "poll";
  groupIdString?: string;
}

export type FormatTimeDifference = (
  date: string | null,
  options?: { excludeAgo?: boolean }
) => string;

export type FilterType = "all" | "top" | "last24h" | "last72h" | "last1month";

export interface TagFilterHeaderProps {
  tag: string | null;
  resetPath: string;
}

export interface CreatorInfoProps {
  creator: IUser | UserDetails | null;
  isAnonymous: boolean;
  gender: string | null;
  level: string;
  formattedDate: string;
  location: string | null;
  borderClass?: string;
}

export interface ReactionButtonsProps {
  canGreat: boolean;
  isGreat: boolean;
  handleGreat: () => void;
  greatCount: number;
  canLike: boolean;
  isLiked: boolean;
  handleLike: () => void;
  likeCount: number;
  canSuperLike: boolean;
  isSuperLiked: boolean;
  handleSuperLike: () => void;
  superLikeCount: number;
  canSimpleLike: boolean;
  isSimpleLiked: boolean;
  handleSimpleLike: () => void;
  simpleLikeCount: number;
  isPoll?: boolean;
}

export interface LockCommentsButtonProps {
  isLocked: boolean;
  canUnlock: boolean;
  handleLockOpen: () => void;
  handleUnlock: () => void;
  canLock: boolean;
}

export interface DraftControlsProps {
  isDeleting: boolean;
  handleDelete: () => void;
  isPublishing: boolean;
  handlePublish: () => void;
  handleEdit: () => void;
}

export interface DescriptionViewerProps {
  description: string;
  maxLength: number;
  createdAt: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  topic:
    | "Help"
    | "Advertise/Partnership"
    | "Report bug or vulnerability"
    | "Other";
  message: string;
}

export interface ContactFormResponse {
  success: boolean;
  message: string;
}

export interface SocialLink {
  name: string;
  url: string;
  icon: string;
}

export interface InfoBarSection {
  id: string;
  title: string;
  content?: string;
  isForm?: boolean;
}

export interface IReaction extends Models.Document {
  userId: string;
  commentId: string;
  emoji: string;
  createdAt: string;
}

export interface ReactionPickerProps {
  canUseSpecialReactions: boolean;
  specialReactions: string[];
  userReactionEmoji: string | null;
  handleReaction: (reaction: string) => void;
  showPicker: boolean;
  setShowPicker: (v: boolean) => void;
}

export interface BestFlairProps {
  hasBestFlair: boolean;
  isPostCreator: boolean;
  commentUserId: string;
  currentUserId: string | undefined;
  handleToggleBestFlair: (commentId: string) => void;
  commentId: string;
}

export interface CommentContentProps {
  editMode: string | null;
  commentId: string;
  updatedContent: string;
  setUpdatedContent: (v: string) => void;
  onAddEdit: (id: string) => void;
  setEditMode: (id: string | null) => void;
  hasBestFlair: boolean;
  renderContentWithMentions: (content: string) => JSX.Element[];
  content: string;
}

export interface ReactionCountsProps {
  reactionCounts: Record<string, number>;
  setSelectedEmoji: (v: string | null) => void;
  setShowReactionModal: (v: boolean) => void;
}

export interface ReactionModalProps {
  showReactionModal: boolean;
  setShowReactionModal: (v: boolean) => void;
  selectedEmoji: string | null;
  reactionUsers: UserDetails[];
}

export interface CommentHeaderProps {
  comment: IComment;
  user: UserDetails;
  likes: Record<string, string[]>;
  onLike: (commentId: string) => void;
  onFetchLikedUsers: (commentId: string) => void;
  onReply: (commentId: string | null) => void;
  disabled: boolean;
  handleDeleteComment: () => void;
  handleLockComment: () => void;
  handleUnlockComment: () => void;
  setEditMode: (id: string | null) => void;
  setUpdatedContent: (content: string) => void;
  withinFiveMin: boolean;
  hasBestFlair: boolean;
  isPostAnonymous?: boolean;
  postCreatorId?: string;
  postId?: string;
}

export interface ReplyListProps {
  replies: IComment[];
  user: UserDetails;
  editMode: string | null;
  setEditMode: (v: string | null) => void;
  updatedContent: string;
  setUpdatedContent: (v: string) => void;
  onAddEdit: (id: string, isReply?: boolean) => void;
  showReplies: Record<string, number>;
  setRepliesToShow: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >;
  commentId: string;
  totalReplies: number;
  likes: Record<string, string[]>;
  onLike: (commentId: string) => void;
  onFetchLikedUsers: (commentId: string) => void;
  disabled: boolean;
  onReply: (commentId: string | null) => void;
  replyToCommentId: string | null;
  parentIsLocked: boolean;
}
export interface ReplyItemProps {
  reply: IComment;
  user: UserDetails;
  editMode: string | null;
  setEditMode: (id: string | null) => void;
  updatedContent: string;
  setUpdatedContent: (value: string) => void;
  onAddEdit: (id: string, isReply?: boolean) => void;
  disabled?: boolean;
  onReply?: (id: string | null) => void;
  replyToCommentId?: string | null;
  showReplies: Record<string, number>;
  setRepliesToShow: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >;
  parentIsLocked: boolean; // Added to prevent unlocking if parent is locked
}

export type AuthModalMode = "signin" | "signup" | "business";

export interface AuthModalContextType {
  isOpen: boolean;
  mode: AuthModalMode | null;
  openAuthModal: (mode: AuthModalMode) => void;
  closeAuthModal: () => void;
}
export type NotificationCategory = "questions" | "polls" | "groups";

export interface IChat {
  $id: string;
  chatId: string;
  userIds: string[];
  createdAt: string;
  userNames?: string[];
  userImages?: string[];
  updatedAt?: string;
  lastSeenAt?: string[];
  lastMessage?: string;
  lastSenderId?: string;
}

export interface IMessageWithDate extends IChatMessage {
  showDateSeparator?: boolean;
  dateLabel?: string;
}

export interface ISendMessageParams {
  senderId: string;
  receiverId: string;
  content: string;
  imageUrls?: string[];
}

export interface IToggleLikeMessageParams {
  messageId: string;
  userId: string;
  currentLikedBy: string[];
  chatId: string;
}
export interface MessagesPageState {
  selectedUserId?: string;
}

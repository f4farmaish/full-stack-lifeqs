export enum QUERY_KEYS {
  // AUTH KEYS
  CREATE_USER_ACCOUNT = "createUserAccount",

  // USER KEYS
  GET_CURRENT_USER = "getCurrentUser",
  GET_USERS = "getUsers",
  GET_USER_BY_ID = "getUserById",

  // POST KEYS
  GET_POSTS = "getPosts",
  GET_INFINITE_POSTS = "getInfinitePosts",
  GET_RECENT_POSTS = "getRecentPosts",
  GET_POST_BY_ID = "getPostById",
  GET_USER_POSTS = "getUserPosts",

  // SEARCH KEYS
  SEARCH_POSTS = "getSearchPosts",

  // COMMENT KEYS
  GET_COMMENTS = "getComments",

  // GROUP KEYS
  GET_GROUPS = "getGroups",
  GET_USERS_NOT_IN_GROUP = "getUsersNotInGroup",
  ADD_MEMBER_TO_GROUP = "addMemberToGroup",
  GET_GROUPS_BY_CATEGORY = "getGroupsByCategory", // New key

  // POLL KEYS (Add this section)
  GET_POLL_BY_ID = "getPollById", // Added for fetching poll details

  GET_POINT_HISTORY = "getPointHistory",
  GET_USERS_BY_POINT_HISTORY = "GET_USERS_BY_POINT_HISTORY",
  GET_USER_SAVED_ITEMS = "GET_USER_SAVED_ITEMS",
  CHECK_FILE_EXISTS = "CHECK_FILE_EXISTS",

  MESSAGES = "messages",
  CHATS = "chats",
  CONVERSATIONS = "conversations",
  MESSAGE_COUNT = "messageCount",
  UNREAD_COUNT = "unreadCount",
}
export const chatQueryKeys = {
  messages: (chatId: string) => [QUERY_KEYS.MESSAGES, chatId] as const,
  messageCount: (chatId: string) => [QUERY_KEYS.MESSAGE_COUNT, chatId] as const,
  unreadCount: (userId: string) => [QUERY_KEYS.UNREAD_COUNT, userId] as const,
  conversations: (userId: string) =>
    [QUERY_KEYS.CONVERSATIONS, userId] as const,
} as const;

import { appwriteConfig, databases, storage } from "@/lib/appwrite/config";
import { getUserById } from "./userService";
import { ID, Models, Query } from "appwrite";
import { createNotification } from "./notificationsService";
import { IPoll, IPollOption, IVote } from "@/types";
import { getGroupById, updateGroupActivityTimestamp } from "./groupService";
import { deleteFile, getCategoryNameById, uploadFile } from "./postService";

export async function createPoll({
  question,
  options,
  creatorId,
  categoryId,
  subCategory,
  allowMultipleAnswers,
  groupId,
  durationInDays,
  categoryName,
  file,
  description,
  isAnonymous,
  optionImages,
  isDraft = false,
}: {
  question: string;
  options: { optionText: string; voteCount: number; imageUrl: string | null }[];
  creatorId: string;
  categoryId: string;
  subCategory: string;
  allowMultipleAnswers: boolean;
  groupId?: string | { $id: string } | null;
  durationInDays?: number;
  categoryName?: string;
  file?: File[];
  description?: string | null;
  isAnonymous?: boolean;
  optionImages?: (File | null)[];
  isDraft?: boolean;
}) {
  try {
    // Validate inputs
    if (!question.trim() || options.length < 2 || options.length > 5) {
      console.error("createPoll: Invalid poll data", {
        question,
        optionsLength: options.length,
      });
      throw new Error("Invalid poll data: question and 2-5 options required.");
    }
    if (
      options.some(
        (opt) =>
          typeof opt.optionText !== "string" ||
          !opt.optionText.trim() ||
          opt.optionText.length > 800
      )
    ) {
      console.error("createPoll: Invalid optionText in options", { options });
      throw new Error(
        "All options must have valid non-empty text (up to 800 characters)."
      );
    }

    // Get user information for creator metadata
    const user = await getUserById(creatorId);
    const creatorName = user?.name || "Unknown User";
    const creatorImageUrl = user?.imageUrl || "";

    // Normalize groupId
    const resolvedGroupId = groupId
      ? typeof groupId === "object"
        ? groupId.$id
        : groupId
      : null;

    // Fetch category name from DB if not provided
    const resolvedCategoryName =
      categoryName?.trim() ||
      (await getCategoryNameById(categoryId)) ||
      "Uncategorized";

    // Fetch group name from DB if not provided
    let resolvedGroupName = "";
    if (resolvedGroupId) {
      const group: any = await getGroupById(resolvedGroupId);
      resolvedGroupName = group?.name || "Unnamed Group";
    }

    // Handle main image upload
    let fileUrl: string | null = null;
    let fileId: string | null = null;
    if (file && file.length > 0) {
      const uploadedFile = await storage.createFile(
        appwriteConfig.storageId,
        ID.unique(),
        file[0]
      );
      fileId = uploadedFile.$id;
      fileUrl = storage.getFileView(appwriteConfig.storageId, fileId).href;
    }

    // Handle option images
    const optionImageUrls: (string | null)[] = await Promise.all(
      (optionImages || []).map(async (image) => {
        if (!image) return null;
        const uploadedFile = await storage.createFile(
          appwriteConfig.storageId,
          ID.unique(),
          image
        );
        return storage.getFileView(appwriteConfig.storageId, uploadedFile.$id)
          .href;
      })
    );

    // Build poll document payload (exclude options)
    const payload = {
      question,
      creatorId,
      creator: creatorId,
      creatorName,
      creatorImageUrl,
      categoryId,
      categoryIdString: categoryId,
      categoryName: resolvedCategoryName,
      subCategory,
      allowMultipleAnswers,
      durationInDays: durationInDays ?? null,
      createdAt: new Date().toISOString(),
      groupId: resolvedGroupId,
      groupIdString: resolvedGroupId || null,
      groupName: resolvedGroupName,
      totalVotes: 0,
      imageUrl: fileUrl || null,
      imageId: fileId || null,
      description: description || null,
      isAnonymous: isAnonymous || false,
      isDraft,
    };

    // Set permissions based on draft status
    const permissions = isDraft
      ? [`read:${creatorId}`, `update:${creatorId}`, `delete:${creatorId}`]
      : [`read:*`, `update:${creatorId}`, `delete:${creatorId}`];

    // Create poll
    const poll = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pollsCollectionId,
      ID.unique(),
      { ...payload, $permissions: permissions }
    );

    // Create poll options sequentially
    const optionPromises = options.map(async (option, index) => {
      const imageUrl = optionImages
        ? optionImageUrls[index] || null
        : option.imageUrl || null;
      return databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.pollOptionsCollectionId,
        ID.unique(),
        {
          pollId: poll.$id,
          optionText: option.optionText,
          voteCount: option.voteCount || 0,
          imageUrl,
        }
      );
    });

    await Promise.all(optionPromises);

    // Update group activity if not a draft
    if (resolvedGroupId && !isDraft) {
      await updateGroupActivityTimestamp(resolvedGroupId);
    }

    return poll;
  } catch (error) {
    console.error("createPoll: Error creating poll", { error });
    throw error;
  }
}
//=====================================================================================================
export async function getPolls(
  pageParam = "",
  categoryId?: string | null,
  searchQuery?: string,
  filters: any[] = [], // Additional filters, draft exclusion is enforced separately
  includeDrafts: boolean = false // Explicit flag for drafts
) {
  try {
    const { databaseId, pollsCollectionId, pollOptionsCollectionId } =
      appwriteConfig;

    // Base queries for pagination and filtering
    const queries: any[] = [
      Query.orderDesc("createdAt"),
      Query.limit(10),
      Query.select([
        "$id",
        "$createdAt",
        "question",
        "categoryIdString",
        "categoryName",
        "subCategory",
        "creatorName",
        "creatorId",
        "creatorImageUrl",
        "allowMultipleAnswers",
        "groupIdString",
        "groupName",
        "durationInDays",
        "totalVotes",
        "imageUrl",
        "likedBy",
        "isAnonymous",
        "isDraft",
        "createdAt",
      ]),
      ...(includeDrafts ? [] : [Query.equal("isDraft", false)]), // Enforce draft exclusion unless includeDrafts is true
      ...filters,
    ];

    if (pageParam) {
      queries.push(Query.cursorAfter(pageParam));
    }
    if (categoryId) {
      queries.push(Query.equal("categoryIdString", categoryId));
    }
    if (searchQuery) {
      queries.push(Query.search("question", searchQuery.toLowerCase()));
    }

    // Fetch polls
    const pollsResponse = await databases.listDocuments(
      databaseId,
      pollsCollectionId,
      queries
    );

    if (!pollsResponse.documents.length) {
      return { documents: [] };
    }

    // Extract unique poll IDs
    const pollIds = pollsResponse.documents.map((p) => p.$id);

    // Fetch poll options
    const optionsResponse = pollIds.length
      ? await databases.listDocuments(databaseId, pollOptionsCollectionId, [
          Query.equal("pollId", pollIds),
          Query.orderAsc("$sequence"),
        ])
      : { documents: [] };

    // Map options by poll ID
    const optionsMap: Record<string, any[]> = {};
    optionsResponse.documents.forEach((option) => {
      const pollId = option.pollId?.$id || option.pollId;
      optionsMap[pollId] = optionsMap[pollId] || [];
      optionsMap[pollId].push({
        $id: option.$id,
        optionText: option.optionText,
        voteCount: option.voteCount || 0,
        imageUrl: option.imageUrl || null,
      });
    });

    // Format polls with options and likedBy, respecting isAnonymous
    const pollsWithOptions = pollsResponse.documents.map((poll) => ({
      $id: poll.$id,
      $createdAt: poll.$createdAt,
      question: poll.question || "Untitled Poll",
      categoryName: poll.categoryName || "No Category",
      subCategory: poll.subCategory || "No Subcategory",
      creatorId: poll.creatorId,
      creatorName: poll.isAnonymous
        ? "Anonymous"
        : poll.creatorName || "Unknown User",
      creatorImageUrl: poll.isAnonymous
        ? "/assets/icons/profile-placeholder.svg"
        : poll.creatorImageUrl || "/assets/icons/profile-placeholder.svg",
      allowMultipleAnswers: poll.allowMultipleAnswers || false,
      groupId: poll.groupIdString || null,
      durationInDays: poll.durationInDays ?? 0,
      options: optionsMap[poll.$id] || [],
      imageUrl: poll.imageUrl || null,
      likedBy: poll.likedBy || [],
      totalVotes: poll.totalVotes || 0,
      isAnonymous: poll.isAnonymous || false,
      isDraft: poll.isDraft || false,
      createdAt: poll.createdAt || poll.$createdAt,
    }));

    return { documents: pollsWithOptions };
  } catch (error) {
    console.error("getPolls: Error fetching polls", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}
//======================================================================================
export async function getPollById(pollId: string): Promise<IPoll> {
  if (!pollId) {
    console.error("getPollById: Poll ID is required");
    throw new Error("Poll ID is required");
  }

  try {
    const poll = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pollsCollectionId,
      pollId,
      [
        Query.select([
          "$id",
          "$createdAt",
          "question",
          "categoryIdString",
          "categoryName",
          "subCategory",
          "creatorName",
          "creatorId",
          "creatorImageUrl",
          "allowMultipleAnswers",
          "groupIdString",
          "groupName",
          "durationInDays",
          "totalVotes",
          "imageUrl",
          "description",
          "isAnonymous",
          "likedBy",
          "votedUsers",
          "superLikedBy",
          "simpleLikedBy",
          "superLikeCount",
          "simpleLikeCount",
          "commentsLocked",
          "lockExpiry",
          "lockedBy",
          "isDraft",
          "greatBy",
          "greatCount",
          "createdAt",
        ]),
      ]
    );

    if (!poll) {
      console.error("getPollById: Poll not found", { pollId });
      throw new Error("Poll not found");
    }

    const optionsResponse = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.pollOptionsCollectionId,
      [
        Query.equal("pollId", pollId),
        Query.orderAsc("$createdAt"),
        Query.select(["$id", "optionText", "voteCount", "imageUrl"]),
      ]
    );

    const options: IPollOption[] = optionsResponse.documents.map((option) => ({
      $id: option.$id,
      pollId: pollId,
      optionText: option.optionText || "Untitled Option",
      voteCount: option.voteCount || 0,
      imageUrl: option.imageUrl || null,
    }));

    const formattedPoll: IPoll = {
      type: "poll",
      $id: poll.$id,
      $createdAt: poll.$createdAt,
      $collectionId: poll.$collectionId || appwriteConfig.pollsCollectionId,
      $databaseId: poll.$databaseId || appwriteConfig.databaseId,
      $updatedAt: poll.$updatedAt || poll.$createdAt,
      $permissions: poll.$permissions || [],
      question: poll.question || "Untitled Poll",
      createdAt: poll.createdAt || poll.$createdAt,
      subCategory: poll.subCategory || "",
      allowMultipleAnswers: poll.allowMultipleAnswers || false,
      creatorId: poll.creatorId,
      creator: poll.creatorId,
      creatorName: poll.isAnonymous
        ? "Anonymous"
        : poll.creatorName || "Unknown User",
      creatorImageUrl: poll.isAnonymous
        ? "/assets/icons/profile-placeholder.svg"
        : poll.creatorImageUrl || "/assets/icons/profile-placeholder.svg",
      durationInDays: poll.durationInDays ?? 0,
      totalVotes: poll.totalVotes || 0,
      likes: poll.likedBy || [],
      saves: [],
      categoryId: poll.categoryIdString,
      categoryIdString: poll.categoryIdString,
      categoryName: poll.categoryName || "No Category",
      groupId: poll.groupIdString ? { $id: poll.groupIdString } : null,
      groupIdString: poll.groupIdString || "",
      groupName: poll.groupName || "",
      imageId: poll.imageId || undefined,
      imageUrl: poll.imageUrl || null,
      description: poll.description || null,
      isAnonymous: poll.isAnonymous || false,
      likedBy: poll.likedBy || [],
      superLikedBy: Array.isArray(poll.superLikedBy) ? poll.superLikedBy : [],
      simpleLikedBy: Array.isArray(poll.simpleLikedBy)
        ? poll.simpleLikedBy
        : [],
      superLikeCount: poll.superLikeCount || 0,
      simpleLikeCount: poll.simpleLikeCount || 0,
      options,
      votedUsers: Array.isArray(poll.votedUsers) ? poll.votedUsers : [],
      commentsLocked: poll.commentsLocked || false,
      lockExpiry: poll.lockExpiry || null,
      lockedBy: poll.lockedBy || undefined,
      isDraft: poll.isDraft || false,
      greatBy: poll.greatBy || [],
      greatCount: poll.greatCount || 0,
    };

    return formattedPoll;
  } catch (error) {
    console.error("getPollById: Error fetching poll", { pollId, error });
    throw error;
  }
}
//=================================================================================
// Submit a vote for a poll
export async function voteOnPoll({
  pollId,
  optionIds,
  userId,
}: {
  pollId: string;
  optionIds: string[];
  userId: string;
}) {
  try {
    const existingVote = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.votesCollectionId,
      [Query.equal("pollId", pollId), Query.equal("userId", userId)]
    );

    if (existingVote.documents.length > 0) {
      console.warn("voteOnPoll: User has already voted on poll ID:", pollId);
      throw new Error("User has already voted on this poll.");
    }

    const validOptionIds = optionIds.filter(
      (optionId) => typeof optionId === "string"
    );
    if (validOptionIds.length === 0) {
      console.error(
        "voteOnPoll: No valid options selected for poll ID:",
        pollId
      );
      throw new Error("No valid options selected.");
    }

    // Create votes
    const votePromises = validOptionIds.map((optionId) =>
      databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.votesCollectionId,
        ID.unique(),

        { pollId, optionId, userId }
      )
    );

    await Promise.all(votePromises);

    // Update vote counts
    const optionUpdatePromises = validOptionIds.map(async (optionId) => {
      const option = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.pollOptionsCollectionId,
        optionId
      );

      return databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.pollOptionsCollectionId,
        optionId,
        { voteCount: option.voteCount + 1 }
      );
    });

    await Promise.all(optionUpdatePromises);

    // Fetch updated poll
    const poll: IPoll = await getPollById(pollId);
    if (!poll) {
      console.error("voteOnPoll: Poll not found for ID:", pollId);
      throw new Error("Poll not found.");
    }

    const totalVotes = poll.options.reduce(
      (acc, option) => acc + option.voteCount,
      0
    );

    // Update votedUsers by appending the userId
    const currentVotedUsers = Array.isArray(poll.votedUsers)
      ? poll.votedUsers
      : [];
    if (!currentVotedUsers.includes(userId)) {
      currentVotedUsers.push(userId);
    }

    try {
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.pollsCollectionId,
        pollId,
        {
          totalVotes,
          votedUsers: currentVotedUsers,
        }
      );

      // Verify the update
      const updatedPoll = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.pollsCollectionId,
        pollId,
        [Query.select(["votedUsers"])]
      );
      if (!updatedPoll.votedUsers.includes(userId)) {
        console.error(
          "voteOnPoll: Failed to persist votedUsers update for poll ID:",
          pollId
        );
        throw new Error("Failed to persist voted users update.");
      }
    } catch (error) {
      console.error(
        "voteOnPoll: Failed to update votedUsers for poll ID:",
        pollId,
        error
      );
      throw new Error("Failed to update voted users.");
    }

    // Determine if notifications should be sent
    const durationInDays = poll.durationInDays ?? 0; // Handle undefined durationInDays
    const hasEndDate = durationInDays > 0;
    const pollCreatedAt = new Date(poll.createdAt); // Changed from $createdAt to createdAt
    const endDate = new Date(pollCreatedAt);
    if (hasEndDate) endDate.setDate(endDate.getDate() + durationInDays);
    const now = new Date();

    const isPollEnded = hasEndDate && now >= endDate;
    const notificationType = isPollEnded ? "POLL_RESULTS" : "PARTIAL_RESULTS";
    const message = isPollEnded
      ? `Your poll "${poll.question}" has ended with ${totalVotes} votes.`
      : `Your poll "${poll.question}" has reached ${totalVotes} votes.`;

    // Avoid sending end notification if no duration
    if (isPollEnded && !hasEndDate) {
      return { status: "success" };
    }

    // For end notification: check if already sent
    if (isPollEnded) {
      const existingEnd = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        [
          Query.equal("userId", poll.creatorId),
          Query.equal("relatedEntityId", pollId),
          Query.equal("types", "POLL_RESULTS"),
        ]
      );

      if (existingEnd.documents.length === 0) {
        await createNotification({
          userId: poll.creatorId,
          type: "POLL_RESULTS",
          message,
          relatedEntityId: pollId,
        });
      } else {
      }
    } else {
      // Always send or update partial notification
      const existingPartial = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        [
          Query.equal("userId", poll.creatorId),
          Query.equal("relatedEntityId", pollId),
          Query.equal("types", "PARTIAL_RESULTS"),
        ]
      );

      if (existingPartial.documents.length > 0) {
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.notificationsCollectionId,
          existingPartial.documents[0].$id,
          {
            message,
            isRead: false,
            lastUpdatedAt: new Date().toISOString(),
          }
        );
      } else {
        await createNotification({
          userId: poll.creatorId,
          type: "PARTIAL_RESULTS",
          message,
          relatedEntityId: pollId,
        });
      }
    }

    return { status: "success" };
  } catch (error) {
    console.error("voteOnPoll: Error voting on poll ID:", pollId, error);
    throw error;
  }
}

// Fetch user votes
export const fetchUserVotes = async (userId: string) => {
  try {
    const votes = await getVotesByUser(userId);
    return votes;
  } catch (error) {
    console.error("Error in fetchUserVotes:", error);
    throw error;
  }
};

// Fetch votes by user with pagination
export async function getVotesByUser(
  userId: string,
  pageParam = ""
): Promise<IVote[]> {
  try {
    const { databaseId, votesCollectionId } = appwriteConfig;

    const queries: any[] = [
      Query.equal("userId", userId),
      Query.limit(10), // Pagination enabled
    ];

    if (pageParam) {
      queries.push(Query.cursorAfter(pageParam)); // Pagination cursor
    }

    // Fetch without Query.select() to avoid error
    const votesResponse = await databases.listDocuments(
      databaseId,
      votesCollectionId,
      queries
    );

    return votesResponse.documents.map((doc) => ({
      $id: doc.$id,
      pollId: doc.pollId?.$id || doc.pollId,
      optionId: doc.optionId?.$id || doc.optionId,
      userId: doc.userId,
    }));
  } catch (error) {
    console.error(" Error fetching user votes:", error);
    throw error;
  }
}

// Delete a poll and its associated data
export async function deletePoll(pollId: string): Promise<{ status: string }> {
  try {
    if (!pollId) {
      console.error("pollId is missing. Aborting deletion.");
      throw new Error("pollId is required for deletion.");
    }

    // Delete poll options
    try {
      const pollOptions = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.pollOptionsCollectionId,
        [Query.equal("pollId", pollId)]
      );

      if (pollOptions.documents.length > 0) {
        await Promise.all(
          pollOptions.documents.map((option) =>
            databases.deleteDocument(
              appwriteConfig.databaseId,
              appwriteConfig.pollOptionsCollectionId,
              option.$id
            )
          )
        );
      }
    } catch (err) {
      console.error("Error deleting poll options:", err);
    }

    // Delete votes for the poll
    try {
      const votes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.votesCollectionId,
        [Query.equal("pollId", pollId)]
      );

      if (votes.documents.length > 0) {
        await Promise.all(
          votes.documents.map((vote) =>
            databases.deleteDocument(
              appwriteConfig.databaseId,
              appwriteConfig.votesCollectionId,
              vote.$id
            )
          )
        );
      }
    } catch (err) {
      console.error("Error deleting votes:", err);
    }

    // Delete notifications related to the poll
    try {
      const notifications = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        [Query.equal("relatedEntityId", pollId)]
      );

      if (notifications.documents.length > 0) {
        await Promise.all(
          notifications.documents.map((notification) =>
            databases.deleteDocument(
              appwriteConfig.databaseId,
              appwriteConfig.notificationsCollectionId,
              notification.$id
            )
          )
        );
      }
    } catch (err) {
      console.error("Error deleting notifications:", err);
    }

    // Delete saves associated with this poll
    try {
      const saves = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.savesCollectionId,
        [Query.equal("pollId", pollId)]
      );

      if (saves.documents.length > 0) {
        await Promise.all(
          saves.documents.map((save) =>
            databases.deleteDocument(
              appwriteConfig.databaseId,
              appwriteConfig.savesCollectionId,
              save.$id
            )
          )
        );
      }
    } catch (err) {
      console.error("Error deleting saves:", err);
    }

    // Delete the poll itself
    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.pollsCollectionId,
        pollId
      );
    } catch (err) {
      console.error("Error deleting the poll:", err);
      throw err;
    }

    return { status: "Ok" };
  } catch (error) {
    console.error("Fatal error during poll deletion:", error);
    throw error;
  }
}

// Fetch votes by user for a specific poll
export async function getVotesByUserForPoll(
  userId: string,
  pollId: string
): Promise<IVote[]> {
  try {
    const { databaseId, votesCollectionId } = appwriteConfig;

    const queries: any[] = [
      Query.equal("userId", userId),
      Query.equal("pollId", pollId),
    ];

    const votesResponse = await databases.listDocuments(
      databaseId,
      votesCollectionId,
      queries
    );

    return votesResponse.documents.map((doc) => ({
      $id: doc.$id,
      pollId: doc.pollId?.$id || doc.pollId,
      optionId: doc.optionId?.$id || doc.optionId,
      userId: doc.userId,
    }));
  } catch (error) {
    console.error("Error fetching user votes for poll:", error);
    throw error;
  }
}
//=================================================================
// Fetch users who voted on a specific poll using votedUsers field
export async function getVotedUsersForPoll(
  pollId: string
): Promise<Models.Document[]> {
  try {
    if (!pollId) {
      console.error("getVotedUsersForPoll: Poll ID is required.");
      throw new Error("Poll ID is required.");
    }

    // Fetch the poll to get the votedUsers array with retry
    let poll;
    let retries = 3;
    while (retries > 0) {
      try {
        poll = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.pollsCollectionId,
          pollId,
          [Query.select(["votedUsers"])]
        );
        break;
      } catch (error) {
        console.warn(
          "getVotedUsersForPoll: Retry fetching poll ID:",
          pollId,
          "Retries left:",
          retries,
          error
        );
        retries--;
        if (retries === 0) throw error;
        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms before retry
      }
    }

    if (!poll) {
      console.error("getVotedUsersForPoll: Poll not found for ID:", pollId);
      throw new Error("Poll not found.");
    }

    const votedUsersIds = Array.isArray(poll.votedUsers) ? poll.votedUsers : [];

    if (votedUsersIds.length === 0) {
      return [];
    }

    // Batch fetch users to optimize performance
    const batchSize = 25; // Appwrite query limit
    const userBatches = [];
    for (let i = 0; i < votedUsersIds.length; i += batchSize) {
      userBatches.push(votedUsersIds.slice(i, i + batchSize));
    }

    const userPromises = userBatches.map(async (batch) => {
      try {
        const usersResponse = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          [Query.equal("$id", batch), Query.select(["$id", "name", "imageUrl"])]
        );
        return usersResponse.documents;
      } catch (error) {
        console.error(
          "getVotedUsersForPoll: Error fetching user batch:",
          batch,
          error
        );
        return [];
      }
    });

    const usersArrays = await Promise.all(userPromises);
    const users = usersArrays
      .flat()
      .filter((user): user is Models.Document => user !== null);

    return users;
  } catch (error) {
    console.error(
      "getVotedUsersForPoll: Error fetching voted users for poll ID:",
      pollId,
      error
    );
    throw error;
  }
}
// ==================================================================================================================================
export const superLikePoll = async (
  pollId: string,
  superLikesArray: string[]
): Promise<Models.Document | null> => {
  try {
    if (!pollId) {
      throw new Error("Poll ID is required");
    }

    const poll = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pollsCollectionId,
      pollId
    );

    const currentSuperLikedBy = Array.isArray(poll.superLikedBy)
      ? poll.superLikedBy
      : [];

    const updatedSuperLikes = [
      ...new Set([...currentSuperLikedBy, ...superLikesArray]),
    ];

    const updatedDocument = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pollsCollectionId,
      pollId,
      {
        superLikedBy: updatedSuperLikes,
        superLikeCount: updatedSuperLikes.length,
      }
    );

    if (poll.isAnonymous) {
      return updatedDocument;
    }

    const creatorId = poll.creatorId;
    if (!creatorId) {
      return updatedDocument;
    }

    const superLikeCount = updatedSuperLikes.length;
    const question = poll.question || "Untitled Poll";
    const truncatedQuestion =
      question.length > 80 ? question.substring(0, 77) + "..." : question;
    const notificationMessage = `Your poll "${truncatedQuestion}" has ${superLikeCount} golden heart${
      superLikeCount > 1 ? "s" : ""
    } now.`;

    const existingNotifications = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      [
        Query.equal("userId", creatorId),
        Query.equal("relatedEntityId", pollId),
        Query.equal("types", "SUPER_LIKE_POLL"),
      ]
    );

    if (existingNotifications.documents.length > 0) {
      const notificationId = existingNotifications.documents[0].$id;
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        notificationId,
        {
          message: notificationMessage,
          isRead: false,
          lastUpdatedAt: new Date().toISOString(),
        }
      );
    } else {
      await createNotification({
        userId: creatorId,
        type: "SUPER_LIKE_POLL",
        message: notificationMessage,
        relatedEntityId: pollId,
      });
    }

    return updatedDocument;
  } catch (error: any) {
    console.error("[superLikePoll] Error:", error);
    throw new Error(`Failed to golden heart poll: ${error.message}`);
  }
};
//======================================================================================================
export const simpleLikePoll = async (
  pollId: string,
  simpleLikesArray: string[]
): Promise<Models.Document | null> => {
  try {
    if (!pollId) {
      throw new Error("Poll ID is required");
    }

    const poll = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pollsCollectionId,
      pollId
    );

    const currentSimpleLikedBy = Array.isArray(poll.simpleLikedBy)
      ? poll.simpleLikedBy
      : [];

    const updatedSimpleLikes = [
      ...new Set([...currentSimpleLikedBy, ...simpleLikesArray]),
    ];

    const updatedDocument = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pollsCollectionId,
      pollId,
      {
        simpleLikedBy: updatedSimpleLikes,
        simpleLikeCount: updatedSimpleLikes.length,
      }
    );

    if (poll.isAnonymous) {
      return updatedDocument;
    }

    const creatorId = poll.creatorId;
    if (!creatorId) {
      return updatedDocument;
    }

    const simpleLikeCount = updatedSimpleLikes.length;
    const question = poll.question || "Untitled Poll";
    const truncatedQuestion =
      question.length > 80 ? question.substring(0, 77) + "..." : question;
    const notificationMessage = `Your poll "${truncatedQuestion}" has ${simpleLikeCount} simple heart${
      simpleLikeCount > 1 ? "s" : ""
    } now.`;

    const existingNotifications = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      [
        Query.equal("userId", creatorId),
        Query.equal("relatedEntityId", pollId),
        Query.equal("types", "SIMPLE_LIKE_POLL"),
      ]
    );

    if (existingNotifications.documents.length > 0) {
      const notificationId = existingNotifications.documents[0].$id;
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        notificationId,
        {
          message: notificationMessage,
          isRead: false,
          lastUpdatedAt: new Date().toISOString(),
        }
      );
    } else {
      await createNotification({
        userId: creatorId,
        type: "SIMPLE_LIKE_POLL",
        message: notificationMessage,
        relatedEntityId: pollId,
      });
    }

    return updatedDocument;
  } catch (error: any) {
    console.error("[simpleLikePoll] Error:", error);
    throw new Error(`Failed to simple heart poll: ${error.message}`);
  }
};
//===========================================================================================
export async function lockComments(
  pollId: string,
  duration: number | "permanent",
  lockedBy: string
): Promise<void> {
  try {
    let lockExpiry: string | null = null;
    if (duration !== "permanent") {
      if (duration < 1 || duration > 30) {
        throw new Error("Duration must be between 1 and 30 days");
      }
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + duration);
      lockExpiry = expiryDate.toISOString();
    }
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pollsCollectionId,
      pollId,
      {
        commentsLocked: true,
        lockExpiry: lockExpiry,
        lockedBy: lockedBy,
      }
    );
  } catch (error) {
    console.error("Error locking comments for poll:", error);
    throw error;
  }
}

// Update unlockComments function to enforce admin access control
export async function unlockComments(
  pollId: string,
  userId: string,
  groupId?: string
): Promise<void> {
  try {
    const poll = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pollsCollectionId,
      pollId,
      [Query.select(["lockedBy", "groupIdString"])]
    );

    if (!poll.lockedBy) {
      throw new Error("Comments are not locked or lockedBy is not set.");
    }

    let isGroupAdmin = false;
    if (groupId || poll.groupIdString) {
      const effectiveGroupId = groupId || poll.groupIdString;
      const group = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        effectiveGroupId,
        [Query.select(["admins"])]
      );
      isGroupAdmin = group.admins.includes(userId);
    }

    if (!isGroupAdmin && poll.lockedBy !== userId) {
      throw new Error(
        "Only the admin who locked the comments or another group admin can unlock them."
      );
    }

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pollsCollectionId,
      pollId,
      {
        commentsLocked: false,
        lockExpiry: null,
        lockedBy: null,
      }
    );
  } catch (error) {
    console.error("Error unlocking comments for poll:", error);
    throw error;
  }
}
//==============================================================================
export async function publishPoll(pollId: string): Promise<Models.Document> {
  try {
    if (!pollId) {
      console.error("publishPoll: Poll ID is missing");
      throw new Error("Poll ID is required");
    }

    const poll = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pollsCollectionId,
      pollId
    );

    if (!poll) {
      console.error("publishPoll: Poll not found", { pollId });
      throw new Error("Poll not found");
    }

    if (!poll.isDraft) {
      console.warn("publishPoll: Poll is not a draft", { pollId });
      throw new Error("Poll is not a draft");
    }

    const updatedPoll = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pollsCollectionId,
      pollId,
      {
        isDraft: false,
        createdAt: new Date().toISOString(),
      }
    );

    // Update permissions to make it public
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pollsCollectionId,
      pollId,
      {
        $permissions: [
          `read:*`,
          `update:${poll.creatorId}`,
          `delete:${poll.creatorId}`,
        ],
      }
    );

    // Update group activity if applicable
    if (poll.groupIdString) {
      await updateGroupActivityTimestamp(poll.groupIdString);
    }

    return updatedPoll;
  } catch (error) {
    console.error("publishPoll: Error publishing poll", { pollId, error });
    throw error;
  }
}
//===========================================================================================

export async function updatePoll(pollId: string, updatedData: Partial<IPoll>) {
  try {
    // Fetch existing poll
    const existingPoll = await getPollById(pollId);
    if (!existingPoll) throw new Error("Poll not found");

    // Prepare update payload
    const updatePayload: any = {
      question: updatedData.question || existingPoll.question,
      description: updatedData.description || existingPoll.description,
      categoryId: updatedData.categoryId || existingPoll.categoryId,
      categoryIdString: updatedData.categoryId || existingPoll.categoryIdString,
      categoryName: updatedData.categoryName || existingPoll.categoryName,
      subCategory: updatedData.subCategory || existingPoll.subCategory,
      allowMultipleAnswers:
        updatedData.allowMultipleAnswers !== undefined
          ? updatedData.allowMultipleAnswers
          : existingPoll.allowMultipleAnswers,
      durationInDays:
        updatedData.durationInDays !== undefined
          ? updatedData.durationInDays
          : existingPoll.durationInDays,
      isAnonymous:
        updatedData.isAnonymous !== undefined
          ? updatedData.isAnonymous
          : existingPoll.isAnonymous,
      groupId: updatedData.groupId || existingPoll.groupId,
      groupIdString: updatedData.groupIdString || existingPoll.groupIdString,
      groupName: updatedData.groupName || existingPoll.groupName,
    };

    // Handle image updates
    if (updatedData.file && updatedData.file.length > 0) {
      const uploadedFile = await uploadFile(updatedData.file[0]);
      if (!uploadedFile) throw new Error("File upload failed");
      updatePayload.imageId = uploadedFile.$id;
      updatePayload.imageUrl = storage.getFileView(
        appwriteConfig.storageId,
        uploadedFile.$id
      ).href;
      if (existingPoll.imageId) {
        await deleteFile(existingPoll.imageId);
      }
    } else {
      updatePayload.imageUrl = existingPoll.imageUrl || null;
      updatePayload.imageId = existingPoll.imageId || null;
    }

    // Handle edit history for question
    const createdAt = new Date(existingPoll.$createdAt);
    const now = new Date();
    const diffInMinutes = Math.abs(
      (now.getTime() - createdAt.getTime()) / 60000
    );
    if (
      diffInMinutes > 5 &&
      updatedData.question &&
      updatedData.question !== existingPoll.question
    ) {
      const editHistory = existingPoll.edits || [];
      if (editHistory.length >= 3) {
        throw new Error("Maximum number of updates (3) reached.");
      }
      const newEdit = {
        content: updatedData.question,
        timestamp: now.toISOString(),
      };
      const serializedEdit = JSON.stringify(newEdit);
      updatePayload.edits = [...editHistory, serializedEdit];
    }

    // Update poll document
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pollsCollectionId,
      pollId,
      updatePayload
    );

    // Handle options
    const options = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.pollOptionsCollectionId,
      [Query.equal("pollId", pollId)]
    );
    const deletePromises = options.documents.map((option) =>
      databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.pollOptionsCollectionId,
        option.$id
      )
    );
    await Promise.all(deletePromises);

    if (updatedData.options && updatedData.options.length > 0) {
      const createPromises = updatedData.options.map(
        async (option: IPollOption) => {
          const optionData = {
            pollId: pollId,
            optionText: option.optionText,
            voteCount: option.voteCount || 0,
            imageUrl: option.imageUrl || null,
          };
          return databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.pollOptionsCollectionId,
            ID.unique(),
            optionData
          );
        }
      );
      await Promise.all(createPromises);
    }

    return await getPollById(pollId);
  } catch (error) {
    console.error("updatePoll: Error updating poll", { pollId, error });
    throw error;
  }
}
//============================================================================================
export async function greatPoll(
  pollId: string,
  greatsArray: string[]
): Promise<Models.Document> {
  try {
    const updatedPoll = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pollsCollectionId,
      pollId,
      {
        greatBy: greatsArray,
        greatCount: greatsArray.length,
      }
    );

    const poll = await getPollById(pollId);
    if (!poll) {
      throw new Error("Poll not found");
    }

    if (poll.isAnonymous || !poll.creatorId) {
      return updatedPoll;
    }

    const greatCount = greatsArray.length;
    const question = poll.question || "Untitled Poll";
    const truncatedQuestion =
      question.length > 80 ? question.substring(0, 77) + "..." : question;
    const notificationMessage = `Your poll "${truncatedQuestion}" has ${greatCount} great${
      greatCount > 1 ? "s" : ""
    } now.`;

    const existingNotifications = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      [
        Query.equal("userId", poll.creatorId),
        Query.equal("relatedEntityId", pollId),
        Query.equal("types", "GREAT_POLL"),
      ]
    );

    if (existingNotifications.documents.length > 0) {
      const notificationId = existingNotifications.documents[0].$id;
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        notificationId,
        {
          message: notificationMessage,
          isRead: false,
          lastUpdatedAt: new Date().toISOString(),
        }
      );
    } else {
      await createNotification({
        userId: poll.creatorId,
        type: "GREAT_POLL",
        message: notificationMessage,
        relatedEntityId: pollId,
      });
    }

    return updatedPoll;
  } catch (error) {
    console.error("greatPoll: Error marking poll as Great", { pollId, error });
    throw error;
  }
}
//==========================================================================================
export async function getUserVotedPollsCount(userId: string): Promise<number> {
  if (!userId) {
    console.warn('Missing userId for getUserVotedPollsCount');
    return 0;
  }
  try {
    let offset = 0;
    let totalVotes = 0;
    while (true) {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.votesCollectionId,
        [
          Query.equal('userId', [userId]),
          Query.limit(100),
          Query.offset(offset)
        ]
      );
      totalVotes += response.documents.length;
      if (response.documents.length < 100) break;
      offset += 100;
    }
    return totalVotes;
  } catch (error) {
    console.error('Error fetching user voted polls count:', error);
    throw error;
  }
}
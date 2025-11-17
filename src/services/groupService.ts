import { appwriteConfig, databases, storage } from "@/lib/appwrite/config";
import { ID, Models, Query } from "appwrite";
import { createNotification } from "./notificationsService";
import { IGroupInvitation } from "@/types";

//================================================
export async function createGroup(data: {
  name: string;
  description: string;
  categoryId: string;
  subCategory: string;
  tags?: string;
  creatorId: string;
  creatorName: string;
  creatorImageUrl: string;
  file: File[];
}) {
  try {
    // Trim the group name and check for duplicates
    const trimmedName = data.name.trim();
    if (!trimmedName)
      throw new Error("Group name cannot be empty after trimming");
    const exists = await checkGroupNameExists(trimmedName);
    if (exists)
      throw new Error(
        "A group with this name already exists. Please choose a different name."
      );

    const groupId = ID.unique(); // Generate unique group ID
    let imageId: string | undefined;
    let imageUrl: string | undefined;

    // Handle image upload if file is provided
    if (data.file && data.file.length > 0) {
      const file = data.file[0];
      const fileUpload = await storage.createFile(
        appwriteConfig.storageId,
        ID.unique(),
        file
      );
      imageId = fileUpload.$id;
      imageUrl = storage.getFileView(appwriteConfig.storageId, imageId).href;
    }

    const group = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.groupsCollectionId,
      groupId,
      {
        name: trimmedName,
        description: data.description,
        categoryId: data.categoryId,
        subCategory: data.subCategory,
        tags: data.tags
          ?.split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag)
          .slice(0, 5),
        creatorId: data.creatorId,
        admins: [data.creatorId],
        memberIds: [data.creatorId],
        memberNames: [data.creatorName || "Anonymous"],
        memberImages: [
          data.creatorImageUrl || "/assets/icons/profile-placeholder.svg",
        ],
        createdAt: new Date().toISOString(),
        imageId,
        imageUrl,
        memberCount: 1,
      }
    );

    return group;
  } catch (error) {
    console.error("Error creating group:", error);
    throw error;
  }
}
//====================================================

interface GetGroupsParams {
  pageParam?: string;
  categoryId?: string;
  subCategory?: string;
  search?: string;
  tag?: string;
  categoryMap?: Record<string, string>;
  name?: string;
  filters?: any[];
}

export const getGroups = async ({
  pageParam = "",
  categoryId,
  subCategory,
  search,
  tag,
  categoryMap,
  filters,
}: GetGroupsParams) => {
  const queries: any[] = [Query.limit(12)];

  if (pageParam) {
    queries.push(Query.cursorAfter(pageParam));
  }

  if (categoryId) {
    queries.push(Query.equal("categoryId", categoryId));
  }

  if (subCategory) {
    queries.push(Query.equal("subCategory", subCategory));
  }

  if (search) {
    queries.push(Query.search("name", search));
  }

  if (tag) {
    queries.push(Query.equal("tags", [tag]));
  }

  if (filters) {
    queries.push(...filters);
  } else {
    queries.push(Query.orderDesc("lastActivityTimestamp"));
  }

  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.groupsCollectionId,
      queries
    );

    // Optional: enrich category names if not already passed
    let resolvedCategoryMap = categoryMap;

    if (!resolvedCategoryMap) {
      const categoriesResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.categoriesCollectionId
      );

      resolvedCategoryMap = categoriesResponse.documents.reduce(
        (map: Record<string, string>, category: any) => {
          map[category.$id] = category.name;
          return map;
        },
        {}
      );
    }

    const groupsWithCategoryNames = response.documents.map((group: any) => {
      const resolvedCategoryId =
        typeof group.categoryId === "object"
          ? group.categoryId.$id
          : group.categoryId;

      const categoryName =
        resolvedCategoryMap?.[resolvedCategoryId] || "Unknown Category";

      return {
        ...group,
        categoryName,
        tags: group.tags || [],
      };
    });

    return {
      ...response,
      documents: groupsWithCategoryNames,
    };
  } catch (error) {
    console.error("Error fetching groups:", error);
    throw new Error("Failed to fetch groups. Please try again later.");
  }
};
//====================================================================================
export const getGroupById = async (groupId: string) => {
  try {
    const group = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.groupsCollectionId,
      groupId
    );
    // Ensure creatorId is a string
    const creatorId =
      typeof group.creatorId === "string"
        ? group.creatorId
        : typeof group.creatorId === "object" && group.creatorId?.$id
        ? group.creatorId.$id
        : null;

    if (!creatorId) {
      console.error(
        "Invalid creatorId in group:",
        groupId,
        "Raw creatorId:",
        group.creatorId
      );
      throw new Error("Group creatorId is invalid or missing");
    }

    // Resolve categoryId to string if it's an object
    let resolvedCategoryId = typeof group.categoryId === "string" 
      ? group.categoryId 
      : typeof group.categoryId === "object" && group.categoryId !== null && group.categoryId.$id 
      ? group.categoryId.$id 
      : null;

    // Enrich with categoryName
    let categoryName = "Unknown Category";
    if (resolvedCategoryId && typeof resolvedCategoryId === "string" && resolvedCategoryId.length <= 36 && /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(resolvedCategoryId)) {
      try {
        const category = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.categoriesCollectionId,
          resolvedCategoryId
        );
        categoryName = category.name || "Unknown Category";
      } catch (fetchError) {
        console.error("Error fetching category for group:", groupId, fetchError);
      }
    }

    const formattedGroup = {
      ...group,
      creatorId,
      admins: Array.isArray(group.admins) ? group.admins : [],
      memberIds: Array.isArray(group.memberIds) ? group.memberIds : [],
      memberNames: Array.isArray(group.memberNames) ? group.memberNames : [],
      memberImages: Array.isArray(group.memberImages) ? group.memberImages : [],
      categoryName,  // Added: Resolved category name
      tags: Array.isArray(group.tags) ? group.tags : [],  // Added: Ensure tags is always an array
    };

    return formattedGroup;
  } catch (error) {
    console.error("Error fetching group:", groupId, error);
    throw error;
  }
};
//=========================================================================================
export const downgradeAdmin = async (groupId: string, adminId: string) => {
  try {
    const group = await getGroupById(groupId);

    if (String(adminId) === String(group.creatorId)) {
      console.warn("Cannot downgrade creator:", adminId, "in group:", groupId); // Debug log
      throw new Error("Cannot downgrade the group creator");
    }

    const updatedAdmins = group.admins.filter((id: string) => id !== adminId);
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.groupsCollectionId,
      groupId,
      { admins: updatedAdmins }
    );
  } catch (error) {
    console.error(
      "Error downgrading admin:",
      adminId,
      "in group:",
      groupId,
      error
    );
    throw error;
  }
};

//==============================================================================================

// New function to update group name and synchronize with Posts and Polls
export async function updateGroup(groupId: string, data: { name: string }) {
  try {
    // Fetch current group to compare name
    const currentGroup = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.groupsCollectionId,
      groupId,
      [Query.select(["name"])]
    );

    if (!currentGroup) throw new Error("Group not found");

    // Update group document
    const updatedGroup = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.groupsCollectionId,
      groupId,
      { name: data.name }
    );

    // Check if name changed
    if (currentGroup.name !== data.name) {
      // Update Posts collection
      let lastPostId: string | undefined;
      while (true) {
        const postQueries = [
          Query.equal("groupIdString", groupId),
          Query.limit(100),
          Query.select(["$id", "groupName"]),
        ];
        if (lastPostId) postQueries.push(Query.cursorAfter(lastPostId));

        const posts = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.postCollectionId,
          postQueries
        );

        if (posts.documents.length === 0) break;

        const updatePostPromises = posts.documents.map((post) => {
          if (post.groupName !== data.name) {
            return databases.updateDocument(
              appwriteConfig.databaseId,
              appwriteConfig.postCollectionId,
              post.$id,
              { groupName: data.name }
            );
          }
          return Promise.resolve();
        });

        await Promise.all(updatePostPromises);
        lastPostId = posts.documents[posts.documents.length - 1].$id;

        if (posts.documents.length < 100) break;
      }

      // Update Polls collection
      let lastPollId: string | undefined;
      while (true) {
        const pollQueries = [
          Query.equal("groupIdString", groupId),
          Query.limit(100),
          Query.select(["$id", "groupName"]),
        ];
        if (lastPollId) pollQueries.push(Query.cursorAfter(lastPollId));

        const polls = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.pollsCollectionId,
          pollQueries
        );

        if (polls.documents.length === 0) break;

        const updatePollPromises = polls.documents.map((poll) => {
          if (poll.groupName !== data.name) {
            return databases.updateDocument(
              appwriteConfig.databaseId,
              appwriteConfig.pollsCollectionId,
              poll.$id,
              { groupName: data.name }
            );
          }
          return Promise.resolve();
        });

        await Promise.all(updatePollPromises);
        lastPollId = polls.documents[polls.documents.length - 1].$id;

        if (polls.documents.length < 100) break;
      }
    }

    return updatedGroup;
  } catch (error) {
    console.error("Error updating group:", error);
    throw error;
  }
}

export const getUsersNotInGroup = async (groupId: string) => {
  try {
    const group = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.groupsCollectionId,
      groupId
    );

    if (!group) {
      console.warn("Group not found.");
      return [];
    }

    const existingMemberIds = group.memberIds || [];

    const pendingInviteeIds = await getPendingInviteeIdsForGroup(groupId);

    const idsToExclude = new Set([...existingMemberIds, ...pendingInviteeIds]);

    const excludeQueries = Array.from(idsToExclude).map((id) =>
      Query.notEqual("$id", id)
    );

    const usersResponse = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      excludeQueries
    );

    const users = usersResponse.documents.map((user) => ({
      $id: user.$id,
      name: user.name,
      imageUrl: user.imageUrl || "/assets/icons/profile-placeholder.svg",
    }));

    return users;
  } catch (error) {
    console.error("Error fetching users not in group:", error);
    throw error;
  }
};
//=====================================================================================

export const addMemberToGroup = async ({
  groupId,
  userIds,
}: {
  groupId: string;
  userIds: string[];
}) => {
  try {
    if (!userIds || userIds.length === 0) {
      console.warn("No users provided for addition.");
      return;
    }

    // Fetch current group data to get existing members
    const group = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.groupsCollectionId,
      groupId
    );

    if (!group) {
      console.error("Group not found:", groupId);
      throw new Error("Group not found");
    }

    const currentMembers = new Set(group.memberIds || []);
    const newMembers = userIds.filter((userId) => !currentMembers.has(userId));

    if (newMembers.length === 0) {
      console.warn("All selected users are already members.");
      return;
    }

    // Fetch details of new members
    const usersResponse = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("$id", newMembers)]
    );

    const userMap = usersResponse.documents.reduce(
      (acc, user) => {
        acc[user.$id] = {
          name: user.name,
          imageUrl: user.imageUrl || "/assets/icons/profile-placeholder.svg",
        };
        return acc;
      },
      {} as Record<string, { name: string; imageUrl: string }>
    );

    // Delete any pending or rejected requests for the new members
    const deleteRequestPromises = newMembers.map(async (userId) => {
      const requests = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.membershipRequestsCollectionId,
        [Query.equal("userId", [userId]), Query.equal("groupId", [groupId])]
      );

      const deletePromises = requests.documents.map((request) =>
        databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.membershipRequestsCollectionId,
          request.$id
        )
      );

      await Promise.all(deletePromises);
    });

    await Promise.all(deleteRequestPromises);

    // Update group with new members
    const updatedGroup = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.groupsCollectionId,
      groupId,
      {
        memberIds: [...group.memberIds, ...newMembers],
        memberNames: [
          ...group.memberNames,
          ...newMembers.map((id) => userMap[id]?.name || "Unknown User"),
        ],
        memberImages: [
          ...group.memberImages,
          ...newMembers.map((id) => userMap[id]?.imageUrl),
        ],
        memberCount: group.memberIds.length + newMembers.length,
      }
    );

    return updatedGroup;
  } catch (error) {
    console.error("Error adding members to group:", error);
    throw error;
  }
};

//===========================================================================================

export const fetchGroupsByCategory = async (categoryId: string) => {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.groupsCollectionId,
      [Query.equal("categoryId", categoryId), Query.limit(50)] // Limiting results for better performance
    );

    return response.documents;
  } catch (error) {
    console.error("Error fetching groups by category:", error);
    throw error;
  }
};

//=================================================================================================

export async function fetchGroupContent({
  pageParam,
  search,
  groupId,
}: {
  pageParam?: string;
  search?: string;
  groupId: string;
}): Promise<{ documents: (Models.Document & { type: "post" | "poll" })[] }> {
  const baseQueries = [
    Query.equal("groupId", groupId),
    Query.orderDesc("$createdAt"),
    Query.limit(10),
  ];

  if (pageParam) {
    baseQueries.push(Query.cursorAfter(pageParam));
  }

  let postBaseQueries = [...baseQueries, Query.notEqual("isDraft", true)];
  let pollBaseQueries = [...baseQueries, Query.notEqual("isDraft", true)];

  const hasSearch = search !== undefined && search.trim().length > 0;
  let addAnonymousFilter = false;

  if (hasSearch) {
    const isMentionSearch = search.startsWith('@');
    if (isMentionSearch) {
      addAnonymousFilter = true;
    }
  }

  if (addAnonymousFilter) {
    postBaseQueries.push(Query.equal("isAnonymous", false));
    pollBaseQueries.push(Query.equal("isAnonymous", false));
  }

  try {
    let documents: (Models.Document & { type: "post" | "poll" })[] = [];


    if (hasSearch) {
      let searchFieldPost: string;
      let searchFieldPoll: string;
      let effectiveSearch = search.trim();
      const isMentionSearch = search.startsWith('@');

      if (isMentionSearch) {
        effectiveSearch = search.slice(1).trim();
        searchFieldPost = 'creatorName';
        searchFieldPoll = 'creatorName';
      } else {
        searchFieldPost = 'title';
        searchFieldPoll = 'question';
      }

      if (effectiveSearch.length >= (isMentionSearch ? 1 : 3)) {
        const postQueries = [...postBaseQueries, Query.search(searchFieldPost, effectiveSearch)];
        const pollQueries = [...pollBaseQueries, Query.search(searchFieldPoll, effectiveSearch)];

        const [postsResponse, pollsResponse] = await Promise.all([
          databases.listDocuments<Models.Document>(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postQueries
          ),
          databases.listDocuments<Models.Document>(
            appwriteConfig.databaseId,
            appwriteConfig.pollsCollectionId,
            pollQueries
          ),
        ]);

        documents = [
          ...postsResponse.documents.map((doc) => ({ ...doc, type: "post" as const })),
          ...pollsResponse.documents.map((doc) => ({ ...doc, type: "poll" as const })),
        ];
      } else if (!isMentionSearch) {
        const [postsResponse, pollsResponse] = await Promise.all([
          databases.listDocuments<Models.Document>(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postBaseQueries
          ),
          databases.listDocuments<Models.Document>(
            appwriteConfig.databaseId,
            appwriteConfig.pollsCollectionId,
            pollBaseQueries
          ),
        ]);

        documents = [
          ...postsResponse.documents
            .filter((doc) => doc[searchFieldPost]?.toLowerCase().includes(effectiveSearch.toLowerCase()))
            .map((doc) => ({ ...doc, type: "post" as const })),
          ...pollsResponse.documents
            .filter((doc) => doc[searchFieldPoll]?.toLowerCase().includes(effectiveSearch.toLowerCase()))
            .map((doc) => ({ ...doc, type: "poll" as const })),
        ].slice(0, 10);
      } else {
        // For mention search with empty effectiveSearch, treat as no search but with filter
        const [postsResponse, pollsResponse] = await Promise.all([
          databases.listDocuments<Models.Document>(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postBaseQueries
          ),
          databases.listDocuments<Models.Document>(
            appwriteConfig.databaseId,
            appwriteConfig.pollsCollectionId,
            pollBaseQueries
          ),
        ]);

        documents = [
          ...postsResponse.documents.map((doc) => ({ ...doc, type: "post" as const })),
          ...pollsResponse.documents.map((doc) => ({ ...doc, type: "poll" as const })),
        ];
      }
    } else {
      const [postsResponse, pollsResponse] = await Promise.all([
        databases.listDocuments<Models.Document>(
          appwriteConfig.databaseId,
          appwriteConfig.postCollectionId,
          postBaseQueries
        ),
        databases.listDocuments<Models.Document>(
          appwriteConfig.databaseId,
          appwriteConfig.pollsCollectionId,
          pollBaseQueries
        ),
      ]);

      documents = [
        ...postsResponse.documents.map((doc) => ({ ...doc, type: "post" as const })),
        ...pollsResponse.documents.map((doc) => ({ ...doc, type: "poll" as const })),
      ];
    }

    return { documents };
  } catch (error) {
    console.error("fetchGroupContent: Error fetching group content", error);
    return { documents: [] };
  }
}
//========================================================================================

export const createMembershipRequest = async (
  groupId: string[],
  userId: string[]
) => {
  try {
    // Fetch existing requests for this group
    const existingRequests = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.membershipRequestsCollectionId,
      [Query.equal("groupId", groupId)]
    );

    // Check if the user already has a pending request
    const hasPendingRequest = existingRequests.documents.some(
      (request: any) =>
        request.userId[0] === userId[0] && request.status === "pending"
    );

    if (hasPendingRequest) {
      throw new Error(
        "You have already sent a membership request to this group."
      );
    }

    // Check if the user has a rejected request within the last 2 weeks
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const hasRecentRejectedRequest = existingRequests.documents.some(
      (request: any) =>
        request.userId[0] === userId[0] &&
        request.status === "rejected" &&
        new Date(request.createdAt) > twoWeeksAgo
    );

    if (hasRecentRejectedRequest) {
      throw new Error(
        "Your last request was rejected. You must wait 2 weeks before sending a new request."
      );
    }

    const membershipRequest = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.membershipRequestsCollectionId,
      ID.unique(),
      {
        groupId,
        userId,
        status: "pending",
        createdAt: new Date().toISOString(), // Store the request creation timestamp
      }
    );

    // Fetch the group to get its name and admin list
    const group = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.groupsCollectionId,
      groupId[0]
    );

    if (!group) {
      throw new Error("Group not found.");
    }

    const admins = group.admins || [];
    const groupName = group.name || "Unnamed Group";

    // Handle long group names for better UI display
    const formattedGroupName =
      groupName.length > 50 ? `${groupName.substring(0, 47)}...` : groupName;

    // Send a notification to all admins
    const notificationPromises = admins.map((adminId: string) =>
      createNotification({
        userId: adminId,
        type: "NEW_MEMBERSHIP_REQUEST",
        message: `New request to join the group '${formattedGroupName}' has been received.`,
        relatedEntityId: membershipRequest.$id,
      })
    );

    await Promise.all(notificationPromises);

    return membershipRequest;
  } catch (error) {
    console.error("Error creating membership request:", error);
    throw error;
  }
};

//===========================================================================
export const getMembershipRequests = async (groupId: string) => {
  try {
    // Fetch all membership requests for the group (including accepted and rejected ones)
    const membershipRequests = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.membershipRequestsCollectionId,
      [Query.equal("groupId", [groupId])]
    );

    if (
      !membershipRequests.documents ||
      membershipRequests.documents.length === 0
    ) {
      return { documents: [] };
    }

    // Extract user IDs and admin IDs (decidedBy) from the requests
    const userIds = membershipRequests.documents.flatMap(
      (request) => request.userId
    );
    const adminIds = membershipRequests.documents
      .filter((request) => request.decidedBy)
      .map((request) => request.decidedBy);

    // Fetch user and admin details in bulk
    const uniqueIds = [...new Set([...userIds, ...adminIds])]; // Combine and deduplicate IDs
    const usersResponse = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      uniqueIds.length > 0 ? [Query.equal("$id", uniqueIds)] : []
    );

    // Create a map of user details for quick lookup
    const userMap = usersResponse.documents.reduce(
      (acc, user) => {
        acc[user.$id] = {
          name: user.name || "Unknown User",
          imageUrl: user.imageUrl || "/assets/icons/profile-placeholder.svg",
        };
        return acc;
      },
      {} as Record<string, { name: string; imageUrl: string }>
    );

    // Enrich membership requests with user and admin details
    const enrichedRequests = membershipRequests.documents.map((request) => ({
      ...request,
      userName: userMap[request.userId[0]]?.name || "Unknown User",
      userImageUrl:
        userMap[request.userId[0]]?.imageUrl ||
        "/assets/icons/profile-placeholder.svg",
      adminName: request.decidedBy
        ? userMap[request.decidedBy]?.name || "Unknown Admin"
        : null,
      status: request.status || "pending",
      createdAt: request.createdAt || new Date().toISOString(),
    }));

    return { documents: enrichedRequests };
  } catch (error) {
    console.error("Error fetching membership requests:", error);
    throw error;
  }
};
//=============================================================================

export const acceptMembershipRequest = async ({
  requestId,
  groupId,
  userId,
  adminId,
}: {
  requestId: string;
  groupId: string | string[];
  userId: string;
  adminId: string;
}) => {
  try {
    const resolvedGroupId = Array.isArray(groupId) ? groupId[0] : groupId;

    if (!resolvedGroupId) {
      throw new Error("Invalid groupId provided.");
    }

    // Fetch the group details to get the name and members list
    const group = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.groupsCollectionId,
      resolvedGroupId
    );

    if (!group) {
      throw new Error("Group not found.");
    }

    // Prevent duplicate member addition
    const currentMemberIds = group.memberIds || [];
    if (currentMemberIds.includes(userId)) {
      return;
    }

    // Update the membership request status to "accepted" and set decidedBy
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.membershipRequestsCollectionId,
      requestId,
      { status: "accepted", decidedBy: adminId }
    );

    // Fetch the user details
    const user = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId
    );

    // Update group with new member
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.groupsCollectionId,
      resolvedGroupId,
      {
        memberIds: [...currentMemberIds, userId],
        memberNames: [...(group.memberNames || []), user.name],
        memberImages: [
          ...(group.memberImages || []),
          user.imageUrl || "/assets/icons/profile-placeholder.svg",
        ],
      }
    );

    // Ensure long group names are truncated for readability
    const formattedGroupName =
      group.name.length > 50 ? `${group.name.substring(0, 47)}...` : group.name;

    // Send a notification to the user with the correct group name
    await createNotification({
      userId,
      type: "MEMBERSHIP_REQUEST_APPROVED",
      message: `Your request to join the group '${formattedGroupName}' has been approved.`,
      relatedEntityId: resolvedGroupId,
    });

    // Remove related notifications for the membership request
    const notifications = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      [Query.equal("relatedEntityId", requestId)]
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
  } catch (error) {
    console.error("Error accepting membership request:", error);
    throw error;
  }
};
//======================================================================================
export const rejectMembershipRequest = async ({
  requestId,
  adminId,
}: {
  requestId: string;
  adminId: string;
}) => {
  try {
    // Update request status to "rejected" and set decidedBy
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.membershipRequestsCollectionId,
      requestId,
      { status: "rejected", decidedBy: adminId }
    );

    // Fetch and delete the notification associated with the membership request
    const notifications = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      [Query.equal("relatedEntityId", requestId)]
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
  } catch (error) {
    console.error("Error rejecting membership request:", error);
    throw error;
  }
};

//======================================================================

export const deleteMembershipRequest = async (requestId: string) => {
  try {
    // Fetch the membership request to get the related notification
    const request = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.membershipRequestsCollectionId,
      requestId
    );

    if (!request) {
      return;
    }

    // Delete the corresponding notification
    const notifications = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      [Query.equal("relatedEntityId", requestId)]
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

    // Delete the membership request
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.membershipRequestsCollectionId,
      requestId
    );
  } catch (error) {
    console.error("Error deleting membership request:", error);
    throw error;
  }
};

//===============================================================================

export const setPendingMembershipRequest = async (requestId: string) => {
  try {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.membershipRequestsCollectionId,
      requestId,
      { status: "pending" }
    );
  } catch (error) {
    console.error("Error setting membership request to pending:", error);
    throw error;
  }
};

//===================================================================================

export const deleteOldMembershipRequests = async () => {
  try {
    // Calculate the date 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Fetch all requests older than 6 months
    const oldRequests = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.membershipRequestsCollectionId,
      [Query.lessThan("createdAt", sixMonthsAgo.toISOString())]
    );

    // Delete each old request
    const deletePromises = oldRequests.documents.map((request) =>
      databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.membershipRequestsCollectionId,
        request.$id
      )
    );

    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error deleting old membership requests:", error);
    throw error;
  }
};

//================================================================================

export async function updateGroupActivityTimestamp(groupId: string) {
  try {
    const updatedGroup = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.groupsCollectionId,
      groupId,
      {
        lastActivityTimestamp: new Date().toISOString(),
      }
    );

    return updatedGroup;
  } catch (error) {
    console.error("Error updating group activity timestamp:", error);
    throw error;
  }
}
//================================================================================================
export async function createGroupInvitation({
  groupId,
  inviteeIds,
  inviterId,
}: {
  groupId: string;
  inviteeIds: string[];
  inviterId: string;
}): Promise<void> {
  try {
    // Input validation
    if (!groupId || !inviterId || !inviteeIds || inviteeIds.length === 0) {
      throw new Error(
        "Missing required parameters: groupId, inviterId, or inviteeIds"
      );
    }
    if (inviteeIds.includes(inviterId)) {
      throw new Error("Inviter cannot invite themselves");
    }

    // Fetch inviter's name and group details in a single query
    const [inviter, group] = await Promise.all([
      databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        inviterId,
        [Query.select(["name"])]
      ),
      databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        groupId,
        [Query.select(["name", "memberIds"])]
      ),
    ]);

    const inviterName = inviter.name || "Anonymous";

    const existingInvitations = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.groupInvitationsCollectionId,
      [
        Query.equal("groupId", groupId),
        Query.equal("inviteeId", inviteeIds),
        Query.equal("status", "pending"),
      ]
    );

    const existingInviteeIds = new Set(
      existingInvitations.documents.map((inv) => inv.inviteeId)
    );
    const validInviteeIds = inviteeIds.filter(
      (id) => !group.memberIds.includes(id) && !existingInviteeIds.has(id)
    );

    if (validInviteeIds.length === 0) {
      return;
    }

    // Create invitations in bulk
    const invitationPromises = validInviteeIds.map((inviteeId) =>
      databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupInvitationsCollectionId,
        ID.unique(),
        {
          inviteeId,
          groupId,
          inviterId,
          status: "pending",
          createdAt: new Date().toISOString(),
        } as IGroupInvitation
      )
    );

    const invitations = await Promise.all(invitationPromises);

    // Create notifications for all valid invitees
    const notificationPromises = validInviteeIds.map((inviteeId, index) =>
      createNotification({
        userId: inviteeId,
        type: "GROUP_INVITATION",
        message: `${inviterName} has invited you to join the group '${group.name}'.`,
        relatedEntityId: invitations[index].$id,
      })
    );

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error("Error creating group invitation:", error);
    throw new Error(
      `Failed to create group invitation: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
//===================================================================
// Accept Group Invitation
export async function acceptGroupInvitation(
  invitationId: string,
  userId: string
) {
  try {
    // Fetch the invitation
    const invitation = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.groupInvitationsCollectionId,
      invitationId
    );

    if (invitation.status !== "pending" || invitation.inviteeId !== userId) {
      throw new Error("Invalid invitation or not pending");
    }

    // Update invitation status to accepted
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.groupInvitationsCollectionId,
      invitationId,
      { status: "accepted" }
    );

    // Add user to the group
    await addMemberToGroup({
      groupId: invitation.groupId,
      userIds: [userId],
    });
  } catch (error) {
    console.error("Error accepting group invitation:", error);
    throw error;
  }
}

// Decline Group Invitation
export async function declineGroupInvitation(
  invitationId: string,
  userId: string
) {
  try {
    // Fetch the invitation
    const invitation = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.groupInvitationsCollectionId,
      invitationId
    );

    if (invitation.status !== "pending" || invitation.inviteeId !== userId) {
      throw new Error("Invalid invitation or not pending");
    }

    // Update invitation status to declined
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.groupInvitationsCollectionId,
      invitationId,
      { status: "declined" }
    );
  } catch (error) {
    console.error("Error declining group invitation:", error);
    throw error;
  }
}
//======================================================================
export async function getPendingInviteeIdsForGroup(groupId: string) {
  try {
    const invitations = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.groupInvitationsCollectionId,
      [Query.equal("groupId", groupId), Query.equal("status", "pending")]
    );

    return invitations.documents.map((inv) => inv.inviteeId);
  } catch (error) {
    console.error("Error fetching pending invitee IDs:", error);
    return [];
  }
}
interface EffectiveMember {
  id: string;
  name: string;
  image: string;
  role: string;
}

export async function getEffectiveMembers(groupId: string, isAdmin: boolean) {
  try {
    const group = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.groupsCollectionId,
      groupId
    );

    if (!group) {
      return [];
    }

    // Resolve creatorId to string (handles Appwrite relationship object)
    const creatorId = typeof group.creatorId === 'string'
      ? group.creatorId
      : group.creatorId?.$id || '';

    // Optional: Normalize admins to strings if they are objects (though schema indicates strings)
    const admins = group.admins.map((admin: any) =>
      typeof admin === 'string' ? admin : admin?.$id || ''
    );

    // Map members with roles: Prioritizes "Creator" over "Admin"
    const currentMembers: EffectiveMember[] = (group.memberIds || []).map(
      (id: string, index: number) => {
        const isAdminUser = admins.includes(id);
        const isCreator = id === creatorId;
        const role = isCreator ? "Creator" : isAdminUser ? "Admin" : "Member";


        return {
          id,
          name: group.memberNames?.[index] || id,
          image:
            group.memberImages?.[index] ||
            "/assets/icons/profile-placeholder.svg",
          role,
        };
      }
    );

    // Sort: Role priority (Creator > Admin > Member), then by join order (oldest first)
    const sortedCurrentMembers = currentMembers.sort((a, b) => {
      const aIndex = group.memberIds.indexOf(a.id);
      const bIndex = group.memberIds.indexOf(b.id);
      const getPriority = (role: string) => role === "Creator" ? 0 : role === "Admin" ? 1 : 2;
      const aPriority = getPriority(a.role);
      const bPriority = getPriority(b.role);
      if (aPriority !== bPriority) return aPriority - bPriority;
      return aIndex - bIndex;
    });

    // Invited members (only for admins, appended at end)
    let invitedMembers: EffectiveMember[] = [];
    if (isAdmin) {
      const invitations = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.groupInvitationsCollectionId,
        [Query.equal("groupId", groupId), Query.equal("status", "pending")]
      );
      const inviteeIds = invitations.documents.map((inv) => inv.inviteeId);
      if (inviteeIds.length > 0) {
        const usersResponse = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          [Query.equal("$id", inviteeIds)]
        );
        invitedMembers = usersResponse.documents.map((user) => ({
          id: user.$id,
          name: user.name || "Unknown",
          image: user.imageUrl || "/assets/icons/profile-placeholder.svg",
          role: "Invited",
        }));
        invitedMembers.sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    const allMembers = [...sortedCurrentMembers, ...invitedMembers];
    return allMembers;
  } catch (error) {
    console.error("Error fetching effective members:", error);
    return [];
  }
}
//======================================================================================================================
export async function getPendingInvitation(
  groupId: string,
  userId: string
): Promise<Models.Document | null> {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.groupInvitationsCollectionId,
      [
        Query.equal("groupId", groupId),
        Query.equal("inviteeId", userId),
        Query.equal("status", "pending"),
        Query.limit(1),
      ]
    );
    return response.documents[0] || null;
  } catch (error) {
    console.error("Error fetching pending invitation:", error);
    throw error;
  }
}
//===========================================================================
export async function getUserMembershipStatus(
  groupId: string,
  userId: string
): Promise<string | null> {
  try {
    const membershipRequests = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.membershipRequestsCollectionId,
      [Query.equal("groupId", groupId), Query.equal("userId", userId)]
    );

    if (membershipRequests.documents.length === 0) {
      return null;
    }

    return membershipRequests.documents[0].status;
  } catch (error) {
    console.error("Error fetching user membership status:", error);
    return null;
  }
}
//===========================================================================================
export async function checkGroupNameExists(name: string): Promise<boolean> {
  const trimmed = name.trim();
  if (!trimmed) return false;
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.groupsCollectionId,
      [Query.equal("name", trimmed), Query.limit(1)]
    );
    return response.documents.length > 0;
  } catch (error) {
    console.error("Error checking group name:", error);
    throw error;
  }
}
//========================================================================
export const removeMemberFromGroup = async ({
  groupId,
  userId,
}: {
  groupId: string;
  userId: string;
}): Promise<Models.Document> => {
  try {
    // Fetch current group data for updates (cached via React Query if called from hook)
    const groupDoc = await getGroupById(groupId);

    if (String(userId) === String(groupDoc.creatorId)) {
      console.warn(`[DEBUG] Cannot remove creator ${userId} from group ${groupId}`);
      throw new Error("Cannot remove the group creator");
    }

    const updatedMembers = groupDoc.memberIds.filter((id: string) => id !== userId);
    const updatedMemberNames = groupDoc.memberNames.filter(
      (_: string, index: number) => groupDoc.memberIds[index] !== userId
    );
    const updatedMemberImages = groupDoc.memberImages.filter(
      (_: string, index: number) => groupDoc.memberIds[index] !== userId
    );
    const updatedAdmins = groupDoc.admins.filter((id: string) => id !== userId);

    const updatedGroup = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.groupsCollectionId,
      groupId,
      {
        memberIds: updatedMembers,
        memberNames: updatedMemberNames,
        memberImages: updatedMemberImages,
        admins: updatedAdmins,
      }
    );

    return updatedGroup;
  } catch (error) {
    console.error(`[DEBUG] Error in removeMemberFromGroup for ${userId} in ${groupId}:`, error);
    throw error;
  }
};
//==================================================================================================================

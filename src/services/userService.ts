import { databases, appwriteConfig, storage } from "@/lib/appwrite/config";
import { getUserLevelFromPoints } from "@/lib/levelUtils";
import { ACTION_POINTS, UserAction } from "@/lib/pointsMapping";
import { Permission, Role, Query, Models } from "appwrite";
import { deleteFile, uploadFile } from "./postService";
import { getCurrentUser } from "./authService";
import { createPointHistory } from "./pointHistoryService";
import { createNotification } from "./notificationsService";
import {
  DEFAULT_EMAIL_PREFERENCES,
  DEFAULT_NOTIFICATION_PREFERENCES,
  INotificationPreferences,
  UserDetails,
} from "../types/index";
//=================================================================================

const SPECIAL_DAYS = [
  { day: 1, month: 1 }, // New Year's Day
  { day: 14, month: 2 }, // Valentine's Day
  { day: 8, month: 3 }, // International Women's Day
  { day: 1, month: 5 }, // International Workers' Day
  { day: 4, month: 5 }, // Declaration of Independence-Latvia
  { day: 23, month: 6 }, // Midsummer - Latvia
  { day: 18, month: 11 }, // Proclamation of Latvia
  { day: 19, month: 11 }, // International Men's Day
  { day: 24, month: 12 }, // Christmas Eve
  { day: 25, month: 12 }, // Christmas
  { day: 31, month: 12 }, // New Year's Eve
  { day: 4, month: 4 }, // test
];

export function isTodaySpecial() {
  const today = new Date();
  return SPECIAL_DAYS.some(
    (d) => d.day === today.getDate() && d.month === today.getMonth() + 1
  );
}

//=================================================================================
export async function getUserById(userId: string): Promise<UserDetails> {
  try {
    if (!userId || typeof userId !== "string" || userId.length > 36) {
      console.error(`[getUserById] Invalid userId: ${userId}`);
      throw new Error(
        "Invalid userId: Must be a valid string with a maximum length of 36."
      );
    }

    const user = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      [
        Query.select([
          "$id",
          "name",
          "email",
          "imageUrl",
          "imageId",
          "bio",
          "dateOfBirth",
          "gender",
          "point",
          "level",
          "greatsToday",
          "lastGreatReset",
          "$createdAt",
          "lastActive",
          "walletBalance",
          "relationshipStatus",
          "occupation",
          "educationLevel",
          "firstName",
          "lastName",
          "greatCommentNumber",
          "greatQuestionsNumber",
          "repliesNumber",
          "likeNumber",
          "NumberQuestionsAsked",
          "numberPoll",
          "totalLikes",
          "LoggedInCount",
          "notificationPreferences",
          "emailPreferences",
        ]),
      ]
    );

    if (!user) {
      console.error(`[getUserById] No user found for userId: ${userId}`);
      throw new Error(`User not found for ID: ${userId}`);
    }

    return {
      ...user,
      name: user.name || "Unnamed User",
      imageUrl: user.imageUrl || "/assets/icons/profile-placeholder.svg",
      imageId: user.imageId || "",
      bio: user.bio ? user.bio.substring(0, 150) : "",
      point: user.point || 0,
      level: user.level || 1,
      gender: user.gender || null,
      dateOfBirth: user.dateOfBirth || null,
      greatsToday: user.greatsToday || 0,
      lastGreatReset: user.lastGreatReset || null,
      $createdAt: user.$createdAt || null,
      lastActive: user.lastActive || null,
      walletBalance: user.walletBalance || 0,
      relationshipStatus: user.relationshipStatus || "",
      occupation: user.occupation || "",
      educationLevel: user.educationLevel || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      notificationPreferences:
        user.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES,
      greatCommentNumber: user.greatCommentNumber || "",
      greatQuestionsNumber: user.greatQuestionsNumber || "",
      repliesNumber: user.repliesNumber || "",
      likeNumber: user.likeNumber || "",
      NumberQuestionsAsked: user.NumberQuestionsAsked || "",
      numberPoll: user.numberPoll || "",
      totalLikes: user.totalLikes || "",
      LoggedInCount: user.LoggedInCount || "",
      notificationPreferences:
        user.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES,
      emailPreferences: user.emailPreferences || DEFAULT_EMAIL_PREFERENCES,
    } as UserDetails;
  } catch (error) {
    console.error(`[getUserById] Error fetching user by ID: ${userId}`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error instanceof Error
      ? error
      : new Error(`Failed to fetch user: ${String(error)}`);
  }
}
//===============================================================================================================
// Update user level and points based on an action
export async function updateUserLevelAndPoints(
  userId: string,
  action: UserAction
) {
  try {
    // 1. Get the user document with current level and points
    const userDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      [Query.select(["point", "level"])]
    );
    if (!userDoc) throw new Error("User not found");

    // 2. Calculate new points
    const pointChange = ACTION_POINTS[action] || 0;
    const newPoints = (userDoc.point || 0) + pointChange;

    // 3. Calculate new level with updated points
    const userWithNewPoints = { ...userDoc, point: newPoints };
    const newLevel = getUserLevelFromPoints(userWithNewPoints);
    const currentLevel = userDoc.level || 0;

    // 4. Create point history record
    await createPointHistory({
      userId,
      reason: action,
      point: pointChange,
    });

    // 5. Update the user doc with only valid attributes
    const updatePayload = {
      point: newPoints,
      level: newLevel,
    };
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      updatePayload
    );

    // 6. Send level change notifications
    if (newLevel !== currentLevel) {
      if (newLevel > currentLevel) {
        // Level up notification
        await createNotification({
          userId,
          type: "LEVEL_UP",
          message: `You achieved a new level! You are now Level ${newLevel}`,
          relatedEntityId: userId, // Points to user profile for level section
        });
      } else if (newLevel < currentLevel) {
        // Level down notification
        await createNotification({
          userId,
          type: "LEVEL_DOWN",
          message: `You lost a level. You are now Level ${newLevel}`,
          relatedEntityId: userId, // Points to user profile for level section
        });
      }
    }

    return updatedUser;
  } catch (error: any) {
    console.error("Error updating user level/points:", {
      message: error.message,
      code: error.code,
    });
    throw error;
  }
}
// ============================== SAVE USER TO DB
export async function saveUserToDB(user: {
  accountId: string;
  email: string;
  name: string;
  imageUrl: URL;
  dateOfBirth: string | null;
  gender: string | null;
  relationshipStatus: string;
  occupation: string;
  educationLevel: string;
  firstName: string;
  lastName: string;
  point: number;
  level?: number;
  isOnline?: boolean;
  questionsAskedToday?: number;
  specialBonusesAwarded?: string[];
}) {
  try {
    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      user.accountId,
      {
        accountId: user.accountId,
        email: user.email,
        name: user.name,
        imageUrl: user.imageUrl, // Already string from caller
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        relationshipStatus: user.relationshipStatus,
        occupation: user.occupation,
        educationLevel: user.educationLevel,
        firstName: user.firstName,
        lastName: user.lastName,
        point: user.point,
        level: user.level || 1,
        isOnline: user.isOnline || false,
        questionsAskedToday: user.questionsAskedToday || 0,
        specialBonusesAwarded: user.specialBonusesAwarded || [],
        suspended: false,
        suspensionTimestamp: null,
        commentSortBy: "likes",
        notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES, // string[]
      }
    );
    return newUser; // Return the created user object
  } catch (error: any) {
    console.error("Error saving user to database:", {
      message: error.message,
      code: error.code,
    });
    throw error;
  }
}
// ============================== GET USERS

// Define allowed query types for Appwrite
type AppwriteQuery = string;

export async function getUsers(
  limit: number = 50,
  offset: number = 0,
  filters: AppwriteQuery[] = []
): Promise<Models.DocumentList<UserDetails>> {
  // Validate inputs
  if (limit < 1 || !Number.isInteger(limit)) {
    console.error("getUsers: Invalid limit value", { limit });
    throw new Error("Limit must be a positive integer");
  }
  if (offset < 0 || !Number.isInteger(offset)) {
    console.error("getUsers: Invalid offset value", { offset });
    throw new Error("Offset must be a non-negative integer");
  }

  const queries: AppwriteQuery[] = [...filters];
  // Only add default order if no order query is provided
  if (!filters.some((f) => f.includes("orderDesc") || f.includes("orderAsc"))) {
    queries.push(Query.orderDesc("point"));
  }
  queries.push(Query.limit(limit), Query.offset(offset));

  try {
    const users = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId, // Corrected to usersCollectionId
      queries
    );
    return users as Models.DocumentList<UserDetails>;
  } catch (error) {
    console.error("getUsers: Error fetching users:", {
      error,
      limit,
      offset,
      filters,
    });
    throw error;
  }
}
//======================================
export async function getUserGroups(
  userId: string,
  limit = 1000,
  cursor?: string
) {
  try {
    if (!userId) throw new Error("User ID is required");

    const queries = [Query.limit(limit)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.groupsCollectionId,
      queries
    );

    const userGroups = response.documents.filter((group: any) =>
      group.memberIds.includes(userId)
    );

    return userGroups;
  } catch (error) {
    console.error("Error fetching user groups:", error);
    return [];
  }
}

//============================================

export async function getUserPolls(
  userId: string,
  limit = 10,
  cursor?: string,
  currentUserId?: string
) {
  try {
    if (!userId) throw new Error("User ID is required");

    const queries = [
      Query.equal("creatorId", userId),
      Query.notEqual("isDraft", true), // Exclude draft polls
      Query.limit(limit),
    ];

    // Hide anonymous polls from other users (only show to the poll author)
    if (currentUserId !== userId) {
      queries.push(Query.equal("isAnonymous", false));
    }

    if (cursor) queries.push(Query.cursorAfter(cursor));

    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.pollsCollectionId,
      queries
    );

    return response.documents;
  } catch (error) {
    console.error("Error fetching user polls:", error);
    return [];
  }
}

// ============================== UPDATE USER

export interface IUpdateUser {
  userId: string;
  name?: string;
  bio?: string;
  imageUrl?: string;
  imageId?: string;
  file?: File[];
  dateOfBirth?: string;
  gender?: string;
  relationshipStatus?: string;
  occupation?: string;
  educationLevel?: string;
  lastPostDate?: string;
  postsToday?: number;
  greatCommentNumber?: number;
}

export async function updateUser(user: IUpdateUser) {
  try {
    if (!user.userId) {
      throw new Error("User ID is required for updating user document");
    }

    // Fetch current user data to compare changes (only if needed for name/image updates)
    let currentUser;
    if (user.name || user.imageUrl || user.file?.length) {
      currentUser = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        user.userId,
        [Query.select(["name", "imageUrl"])]
      );
    }

    let image = {
      imageUrl: user.imageUrl,
      imageId: user.imageId,
    };

    // Handle file upload if provided
    const hasFileToUpdate = user?.file?.length > 0;
    if (hasFileToUpdate) {
      const uploadedFile = await uploadFile(user.file[0]);
      if (!uploadedFile) throw new Error("File upload failed.");

      const newFileId = uploadedFile.$id;
      const fileUrl = storage.getFileView(
        appwriteConfig.storageId,
        newFileId
      ).href;
      if (!fileUrl) {
        await deleteFile(newFileId);
        throw new Error("Failed to retrieve uploaded image URL.");
      }

      image = { ...image, imageUrl: fileUrl, imageId: newFileId };
    }

    // Prepare update payload
    const updatedData: Partial<IUpdateUser> = {};
    if (user.name !== undefined) updatedData.name = user.name;
    if (user.bio !== undefined)
      updatedData.bio = user.bio ? user.bio.substring(0, 150) : "";
    if (image.imageUrl !== undefined) updatedData.imageUrl = image.imageUrl;
    if (image.imageId !== undefined) updatedData.imageId = image.imageId;
    if (user.dateOfBirth !== undefined)
      updatedData.dateOfBirth = user.dateOfBirth;
    if (user.gender !== undefined) updatedData.gender = user.gender;
    if (user.relationshipStatus !== undefined)
      updatedData.relationshipStatus = user.relationshipStatus;
    if (user.occupation !== undefined) updatedData.occupation = user.occupation;
    if (user.educationLevel !== undefined)
      updatedData.educationLevel = user.educationLevel;
    if (user.lastPostDate !== undefined)
      updatedData.lastPostDate = user.lastPostDate;
    if (user.postsToday !== undefined) updatedData.postsToday = user.postsToday;
    if (user.greatCommentNumber !== undefined)
      updatedData.greatCommentNumber = user.greatCommentNumber;

    // Ensure updatedData is not empty
    if (Object.keys(updatedData).length === 0) {
      throw new Error("No valid data provided for user update");
    }

    // Update user in Appwrite DB
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      user.userId,
      updatedData,
      [
        Permission.update(Role.user(user.userId)), // Allow the user to update their own document
      ]
    );

    if (!updatedUser) {
      if (hasFileToUpdate) {
        await deleteFile(image.imageId);
      }
      throw new Error("User update failed.");
    }

    // Check if name or imageUrl changed
    const nameChanged =
      currentUser && user.name !== undefined && currentUser.name !== user.name;
    const imageUrlChanged =
      currentUser &&
      image.imageUrl !== undefined &&
      currentUser.imageUrl !== image.imageUrl;

    if (nameChanged || imageUrlChanged) {
      // Update Posts collection
      let lastPostId: string | undefined;
      while (true) {
        const postQueries = [
          Query.equal("creatorId", user.userId),
          Query.limit(100),
          Query.select(["$id", "creatorName", "creatorImageUrl"]),
        ];
        if (lastPostId) postQueries.push(Query.cursorAfter(lastPostId));

        const posts = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.postCollectionId,
          postQueries
        );

        if (posts.documents.length === 0) break;

        const updatePostPromises = posts.documents.map((post) => {
          if (
            (nameChanged && post.creatorName !== user.name) ||
            (imageUrlChanged && post.creatorImageUrl !== image.imageUrl)
          ) {
            return databases.updateDocument(
              appwriteConfig.databaseId,
              appwriteConfig.postCollectionId,
              post.$id,
              {
                creatorName: nameChanged ? user.name : post.creatorName,
                creatorImageUrl: imageUrlChanged
                  ? image.imageUrl
                  : post.creatorImageUrl,
              }
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
          Query.equal("creatorId", user.userId),
          Query.limit(100),
          Query.select(["$id", "creatorName", "creatorImageUrl"]),
        ];
        if (lastPollId) pollQueries.push(Query.cursorAfter(lastPollId));

        const polls = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.pollsCollectionId,
          pollQueries
        );

        if (polls.documents.length === 0) break;

        const updatePollPromises = polls.documents.map((poll) => {
          if (
            (nameChanged && poll.creatorName !== user.name) ||
            (imageUrlChanged && poll.creatorImageUrl !== image.imageUrl)
          ) {
            return databases.updateDocument(
              appwriteConfig.databaseId,
              appwriteConfig.pollsCollectionId,
              poll.$id,
              {
                creatorName: nameChanged ? user.name : poll.creatorName,
                creatorImageUrl: imageUrlChanged
                  ? image.imageUrl
                  : poll.creatorImageUrl,
              }
            );
          }
          return Promise.resolve();
        });

        await Promise.all(updatePollPromises);
        lastPollId = polls.documents[polls.documents.length - 1].$id;

        if (polls.documents.length < 100) break;
      }
    }

    // Delete old image after successful update
    if (user.imageId && hasFileToUpdate) {
      await deleteFile(user.imageId);
    }

    return updatedUser;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

//=========================================================== incrementQuestionsAskedToday
export async function incrementQuestionsAskedToday(userId: string) {
  try {
    // Get the current user document to check the last reset date and current count
    const userDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId
    );

    if (!userDoc) {
      throw new Error("User not found");
    }

    const today = new Date().toDateString();
    const lastReset = userDoc.lastQuestionReset
      ? new Date(userDoc.lastQuestionReset).toDateString()
      : null;
    let questionsAskedToday = userDoc.questionsAskedToday || 0;

    // Check if the last reset was today, if not, reset the counter
    if (lastReset !== today) {
      questionsAskedToday = 0; // Reset counter since it's a new day
    }

    // Increment the question count
    questionsAskedToday++;

    // Update the user document with the new count and reset date if necessary
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      {
        questionsAskedToday,
        lastQuestionReset: new Date().toISOString(),
      }
    );

    return updatedUser;
  } catch (error) {
    console.error("[incrementQuestionsAskedToday] Error:", error);
    throw error;
  }
}

//=========================================================== incrementGreatsToday
export async function incrementGreatsToday(userId: string) {
  try {
    // Validate userId
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid userId: Must be a non-empty string.");
    }

    // Get the current user document to check the last reset date and current count
    const userDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      [Query.select(["greatsToday", "lastGreatReset"])]
    );

    if (!userDoc) {
      throw new Error("User not found");
    }

    const today = new Date().toDateString();
    const lastReset = userDoc.lastGreatReset
      ? new Date(userDoc.lastGreatReset).toDateString()
      : null;
    let greatsToday = userDoc.greatsToday || 0;

    // Check if the last reset was today; if not, reset the counter
    if (lastReset !== today) {
      greatsToday = 0; // Reset counter since it's a new day
    }

    // Increment the Great count
    greatsToday += 1;

    // Update the user document with the new count and reset date
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      {
        greatsToday,
        lastGreatReset: new Date().toISOString(),
      }
    );

    return updatedUser;
  } catch (error) {
    console.error("[incrementGreatsToday] Error:", error);
    throw error instanceof Error
      ? new Error(`Failed to increment greats today: ${error.message}`)
      : new Error("An unknown error occurred.");
  }
}

//=========================================================== updateLastLoginDate
export async function updateLastLoginDate(appwriteAccountId: string) {
  try {
    // 1. Find the user doc by accountId
    const userDocList = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", appwriteAccountId)]
    );

    if (userDocList.documents.length === 0) {
      throw new Error(`No user doc found for accountId: ${appwriteAccountId}`);
    }

    const userDoc = userDocList.documents[0];
    const oldLoginDate = userDoc.lastLoginDate || null;

    // 2. Update the user doc with new lastLoginDate
    const updated = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userDoc.$id,
      { lastLoginDate: new Date().toISOString() }
    );

    return oldLoginDate;
  } catch (error) {
    console.error("[updateLastLoginDate] Error:", error);
    throw error;
  }
}

//=========================================================== awardLoginBonus
export async function awardLoginBonus(
  appwriteAccountId: string,
  oldLoginDate?: string | null
) {
  try {
    // Check if bonus was already awarded today using oldLoginDate
    const today = new Date().toDateString();
    if (oldLoginDate && new Date(oldLoginDate).toDateString() === today) {
      return null;
    }

    // 1. Find the user doc by accountId
    const userDocList = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", appwriteAccountId)]
    );

    if (userDocList.documents.length === 0) {
      throw new Error(`No user doc found for accountId: ${appwriteAccountId}`);
    }

    const userDoc = userDocList.documents[0];
    const currentPoints = userDoc.point || 0;
    const newPoints = currentPoints + 5;

    // 2. Update points
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userDoc.$id,
      { point: newPoints }
    );

    return updatedUser;
  } catch (error) {
    console.error("[awardLoginBonus] Error:", error);
    throw error;
  }
}

//================================================ awardBirthdayBonus
export async function awardBirthdayBonus(
  appwriteAccountId: string
): Promise<any> {
  try {
    // Find the user document by matching the stored accountId
    const userDocList = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", appwriteAccountId)]
    );
    if (userDocList.documents.length === 0) {
      throw new Error(
        `No user document found for accountId: ${appwriteAccountId}`
      );
    }
    const userDoc = userDocList.documents[0];

    // Parse the user's date of birth
    const dob = new Date(userDoc.dateOfBirth);
    const today = new Date();

    // Check if today is the user's birthday (month and day match)
    if (
      dob.getMonth() === today.getMonth() &&
      dob.getDate() === today.getDate()
    ) {
      // Check if bonus has already been awarded for this year
      if (
        userDoc.lastBirthdayBonusAwarded?.getFullYear() === today.getFullYear()
      ) {
        return null;
      }

      const updatedUserAwardBirthday = await updateUserLevelAndPoints(
        appwriteAccountId,
        UserAction.BIRTHDAY
      );

      return updatedUserAwardBirthday;
    } else {
      return null;
    }
  } catch (error) {
    console.error("[awardBirthdayBonus] Error:", error);
    throw error;
  }
}

//======================================= awardQuestionBonusForCurrentUser
export async function awardQuestionBonusForCurrentUser(): Promise<any> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Current user document not found.");
    }

    const updatedUser = await updateUserLevelAndPoints(
      currentUser.$id,
      UserAction.ASK_QUESTION
    );

    return updatedUser;
  } catch (error) {
    console.error("[awardQuestionBonusForCurrentUser] Error:", error);
    throw error;
  }
}

//================================================= awardLikeBonusForQuestionForOwner
export async function awardLikeBonusForQuestionForOwner(
  ownerAccountId: string,
  bonusPoints: number
): Promise<any> {
  try {
    // Query the user document by the owner's accountId
    const userDocList = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", ownerAccountId)]
    );

    if (userDocList.documents.length === 0) {
      console.warn(`No user document found for accountId: ${ownerAccountId}`);
      return null;
    }

    const ownerDoc = userDocList.documents[0];
    const currentPoints = ownerDoc.point || 0;
    const newPoints = currentPoints + bonusPoints;

    // Update the owner's document with the new point total
    const updatedOwner = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ownerDoc.$id,
      { point: newPoints }
    );

    return updatedOwner;
  } catch (error) {
    console.error("[awardLikeBonusForQuestionForOwner] Error:", error);
    throw error;
  }
}

//======================================== awardVoteBonusForCurrentUser
export async function awardVoteBonusForCurrentUser(): Promise<any> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.warn("No current user document found.");
      return null;
    }

    const currentPoints = currentUser.point || 0;
    const newPoints = currentPoints + 3;

    // Update the current user's document with the new points
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      currentUser.$id,
      { point: newPoints }
    );

    return updatedUser;
  } catch (error) {
    console.error("[awardVoteBonusForCurrentUser] Error:", error);
    throw error;
  }
}

//======================================================== awardCommentLikeBonusForOwner
export async function awardCommentLikeBonusForOwner(
  ownerAccountId: string,
  bonusPoints: number
): Promise<any> {
  try {
    // Find the user document by matching the stored accountId
    const userDocList = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", ownerAccountId)]
    );

    if (userDocList.documents.length === 0) {
      console.warn(`No user document found for accountId: ${ownerAccountId}`);
      return null;
    }

    const ownerDoc = userDocList.documents[0];
    const currentPoints = ownerDoc.point || 0;
    const newPoints = currentPoints + bonusPoints;

    // Update the user document with the new points value
    const updatedOwner = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ownerDoc.$id,
      { point: newPoints }
    );

    return updatedOwner;
  } catch (error) {
    console.error("[awardCommentLikeBonusForOwner] Error:", error);
    throw error;
  }
}

//======================================================== penalizeForNoLoginDays
export async function penalizeForNoLoginDays(
  userId: string,
  oldLoginDate: string
) {
  try {
    const userDoc = await getUserById(userId);
    if (!userDoc) throw new Error("User not found");

    const lastLogin = new Date(oldLoginDate);
    const now = new Date();

    // Calculate the difference in days (rounded down to whole days)
    const diffInDays = Math.floor(
      (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
    );

    // If the user was absent for X days, subtract X points
    if (diffInDays > 0) {
      const currentPoints = userDoc.point || 0;
      const newPoints: any = currentPoints - diffInDays;

      // Recompute user level based on new points
      const newLevel = getUserLevelFromPoints(newPoints);

      const updatedUser = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        userDoc.$id,
        {
          point: newPoints,
          level: newLevel,
        }
      );

      return updatedUser;
    }

    // If diffInDays <= 0 (i.e., user logged in "today"), do nothing
    return null;
  } catch (error) {
    console.error("Error penalizing user for inactivity:", error);
    throw error;
  }
}

//======================================================================== getUserDocumentsByIds
// Fetch user documents by IDs with selected fields including level
export async function getUserDocumentsByIds(userIds: string[]) {
  if (!userIds || userIds.length === 0) return [];

  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [
        Query.equal("$id", userIds),
        Query.select(["$id", "name", "imageUrl", "level"]),
      ]
    );

    // Log the fetched user documents for debugging

    return response.documents;
  } catch (error) {
    console.error("[getUserDocumentsByIds] Error:", error);
    return [];
  }
}
//====================================================================================
// Update user online status
export async function updateUserOnlineStatus(
  userId: string,
  isOnline: boolean
) {
  try {
    // Verify user exists
    const userDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId
    );
    if (!userDoc) throw new Error(`User not found for userId: ${userId}`);

    // Update only the isOnline field
    const updatePayload = { isOnline };
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      updatePayload
    );

    return updatedUser;
  } catch (error: any) {
    console.error("[updateUserOnlineStatus] Error:", {
      message: error.message,
      code: error.code,
    });
    throw error;
  }
}
//===================================================================================================
// Fetch users based on point history within a date range
export async function getUsersByPointHistory(
  dateRange?: { startDate?: string; endDate: string },
  filters: any[] = []
) {
  try {
    // Return empty result if dateRange is undefined
    if (!dateRange) {
      return { documents: [], total: 0 };
    }

    // Query PointHistory for points within the date range
    const pointHistoryQueries = [Query.limit(1000)]; // Limit to avoid timeout
    if (dateRange.startDate) {
      pointHistoryQueries.push(
        Query.greaterThanEqual("$createdAt", dateRange.startDate)
      );
    }
    pointHistoryQueries.push(
      Query.lessThanEqual("$createdAt", dateRange.endDate)
    );

    const pointHistory = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.pointhistoryCollectionId,
      pointHistoryQueries
    );

    // Aggregate points by userId
    const userPoints: { [key: string]: number } = {};
    pointHistory.documents.forEach((history: any) => {
      const userIdField = history.userId;
      let userId: string | undefined;

      // Handle string userId
      if (typeof userIdField === "string" && userIdField.trim()) {
        userId = userIdField;
      }
      // Handle object userId with accountId
      else if (
        userIdField &&
        typeof userIdField === "object" &&
        typeof userIdField.accountId === "string" &&
        userIdField.accountId.trim()
      ) {
        userId = userIdField.accountId;
      }

      // Aggregate points if userId is valid
      if (userId) {
        userPoints[userId] = (userPoints[userId] || 0) + history.point;
      } else {
      }
    });

    // Fetch user documents for users with points
    const userIds = Object.keys(userPoints);
    if (userIds.length === 0) {
      return { documents: [], total: 0 };
    }

    const userQueries = [
      Query.equal("$id", userIds),
      Query.select([
        "$id",
        "name",
        "imageUrl",
        "point",
        "isOnline",
        "level",
        "gender",
        "dateOfBirth",
      ]),
    ];
    filters.forEach((filter) => {
      if (filter !== Query.orderDesc("point")) {
        // Ignore point sorting for now
        userQueries.push(filter);
      }
    });

    const users = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userQueries
    );

    // Map users with period-based points and sort
    const rankedUsers = users.documents
      .map((user: any) => ({
        ...user,
        point: userPoints[user.$id] || 0, // Use period-based points
      }))
      .filter((user) => user.point > 0) // Only include users with points in period
      .sort((a, b) => b.point - a.point); // Sort by period points

    return {
      documents: rankedUsers,
      total: rankedUsers.length,
    };
  } catch (error) {
    console.error("userService: Error fetching users by point history:", error);
    throw error;
  }
}
//==============================================================================
// Award login points and handle related bonuses and penalties
export async function awardLoginPoints(userId: string) {
  try {
    const oldLoginDate = await updateLastLoginDate(userId);
    const today = new Date().toDateString();

    if (!(oldLoginDate && oldLoginDate === today)) {
      const updatedUser = await updateUserLevelAndPoints(
        userId,
        UserAction.LOGIN_PER_DAY
      );
      if (updatedUser) {
      }

      if (isTodaySpecial()) {
        await updateUserLevelAndPoints(userId, UserAction.SPECIAL_DAY_LOGIN);
      }

      if (oldLoginDate) {
        const penalizedUser = await penalizeForNoLoginDays(
          userId,
          oldLoginDate
        );
        if (penalizedUser) {
        }
      }
    } else {
    }

    const awardBirthday = await awardBirthdayBonus(userId);
    if (awardBirthday) {
    }

    return true;
  } catch (error: any) {
    console.error("Error in awardLoginPoints:", {
      message: error.message,
      code: error.code,
    });
    return false;
  }
}
//===================================================================================================
// Check if a nickname is available (not taken by another user)
export async function checkNicknameAvailability(nickname: string) {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("name", nickname), Query.limit(1)]
    );
    const isAvailable = response.total === 0;
    return isAvailable; // true if available, false if taken
  } catch (error) {
    console.error("Error checking nickname availability:", error);
    return false; // Assume not available on error
  }
}
//==================================================================================================================
export async function suspendUser(userId: string) {
  try {
    // Validate userId
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid userId: Must be a non-empty string.");
    }

    // Verify user exists
    const userDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId
    );
    if (!userDoc) {
      throw new Error(`User not found for userId: ${userId}`);
    }

    // Check if already suspended
    if (userDoc.suspended) {
      throw new Error("Account is already suspended.");
    }

    // Update user document with suspension status and timestamp
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      {
        suspended: true,
        suspensionTimestamp: new Date().toISOString(),
      }
    );

    return updatedUser;
  } catch (error: any) {
    console.error("[suspendUser] Error:", {
      message: error.message,
      code: error.code,
    });
    throw new Error(`Failed to suspend user: ${error.message}`);
  }
}
//==================================================================================

// New function: Increase wallet balance
export async function increaseWalletBalance(userId: string, amount: number) {
  try {
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid userId: Must be a non-empty string.");
    }
    if (typeof amount !== "number" || amount <= 0) {
      throw new Error("Invalid amount: Must be a positive number.");
    }

    // Get current user document to retrieve walletBalance
    const userDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      [Query.select(["walletBalance"])]
    );

    if (!userDoc) {
      throw new Error(`User not found for userId: ${userId}`);
    }

    // Calculate new balance
    const currentBalance = userDoc.walletBalance || 0.0;
    const newBalance = currentBalance + amount;

    // Update walletBalance
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      { walletBalance: newBalance }
    );

    return updatedUser;
  } catch (error) {
    console.error("[increaseWalletBalance] Error:", error);
    throw error instanceof Error
      ? new Error(`Failed to increase wallet balance: ${error.message}`)
      : new Error("An unknown error occurred.");
  }
}

// New function: Decrease wallet balance
export async function decreaseWalletBalance(userId: string, amount: number) {
  try {
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid userId: Must be a non-empty string.");
    }
    if (typeof amount !== "number" || amount <= 0) {
      throw new Error("Invalid amount: Must be a positive number.");
    }

    // Get current user document to retrieve walletBalance
    const userDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      [Query.select(["walletBalance"])]
    );

    if (!userDoc) {
      throw new Error(`User not found for userId: ${userId}`);
    }

    // Calculate new balance
    const currentBalance = userDoc.walletBalance || 0.0;
    if (currentBalance < amount) {
      throw new Error("Insufficient funds in wallet.");
    }
    const newBalance = currentBalance - amount;

    // Update walletBalance
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      { walletBalance: newBalance }
    );

    return updatedUser;
  } catch (error) {
    console.error("[decreaseWalletBalance] Error:", error);
    throw error instanceof Error
      ? new Error(`Failed to decrease wallet balance: ${error.message}`)
      : new Error("An unknown error occurred.");
  }
}
//=====================================================================================================
export async function updateNotificationPreferences(
  userId: string,
  preferences: INotificationPreferences
) {
  try {
    return await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      { notificationPreferences: preferences }
    );
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    throw error;
  }
}

//=================================================================================

export const updateEmailPreferences = async (
  userId: string,
  preferences: INotificationPreferences
) => {
  if (!userId) throw new Error("User ID is required");

  try {
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      { emailPreferences: preferences }
    );

    if (!updatedUser) throw new Error("Failed to update user");

    return updatedUser;
  } catch (error) {
    console.error("Appwrite error :: updateEmailPreferences ::", error);
    throw error;
  }
};

//=========================================================== incrementLikesToday
export async function incrementLikesToday(userId: string) {
  try {
    // Validate userId
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid userId: Must be a non-empty string.");
    }

    // Get the current user document to check the last reset date and current count
    const userDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      [Query.select(["likesToday", "lastLikeReset"])]
    );

    if (!userDoc) {
      throw new Error("User not found");
    }

    const today = new Date().toDateString();
    const lastReset = userDoc.lastLikeReset
      ? new Date(userDoc.lastLikeReset).toDateString()
      : null;
    let likesToday = userDoc.likesToday || 0;

    // Check if the last reset was today; if not, reset the counter
    if (lastReset !== today) {
      likesToday = 0; // Reset counter since it's a new day
    }

    // Increment the Like count
    likesToday += 1;

    // Update the user document with the new count and reset date
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      {
        likesToday,
        lastLikeReset: new Date().toISOString(),
      }
    );

    return updatedUser;
  } catch (error) {
    console.error("[incrementLikesToday] Error:", error);
    throw error instanceof Error
      ? new Error(`Failed to increment likes today: ${error.message}`)
      : new Error("An unknown error occurred.");
  }
}

//=========================================================== incrementSuperLikesToday
export async function incrementSuperLikesToday(userId: string) {
  try {
    // Validate userId
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid userId: Must be a non-empty string.");
    }

    // Get the current user document to check the last reset date and current count
    const userDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      [Query.select(["superLikesToday", "lastLikeReset"])]
    );

    if (!userDoc) {
      throw new Error("User not found");
    }

    const today = new Date().toDateString();
    const lastReset = userDoc.lastLikeReset
      ? new Date(userDoc.lastLikeReset).toDateString()
      : null;
    let superLikesToday = userDoc.superLikesToday || 0;

    // Check if the last reset was today; if not, reset the counter
    if (lastReset !== today) {
      superLikesToday = 0; // Reset counter since it's a new day
    }

    // Increment the Super Like count
    superLikesToday += 1;

    // Update the user document with the new count and reset date
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      {
        superLikesToday,
        lastLikeReset: new Date().toISOString(),
      }
    );

    return updatedUser;
  } catch (error) {
    console.error("[incrementSuperLikesToday] Error:", error);
    throw error instanceof Error
      ? new Error(`Failed to increment super likes today: ${error.message}`)
      : new Error("An unknown error occurred.");
  }
}

export async function incrementSimpleLikesToday(userId: string) {
  try {
    // Validate userId
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid userId: Must be a non-empty string.");
    }

    // Get the current user document to check the last reset date and current count
    const userDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      [Query.select(["simpleLikesToday", "lastLikeReset"])]
    );

    if (!userDoc) {
      throw new Error("User not found");
    }

    const today = new Date().toDateString();
    const lastReset = userDoc.lastLikeReset
      ? new Date(userDoc.lastLikeReset).toDateString()
      : null;
    let simpleLikesToday = userDoc.simpleLikesToday || 0;

    // Check if the last reset was today; if not, reset the counter
    if (lastReset !== today) {
      simpleLikesToday = 0; // Reset counter since it's a new day
    }

    // Increment the Simple Like count
    simpleLikesToday += 1;

    // Update the user document with the new count and reset date
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      {
        simpleLikesToday,
        lastLikeReset: new Date().toISOString(),
      }
    );

    return updatedUser;
  } catch (error) {
    console.error("[incrementSimpleLikesToday] Error:", error);
    throw error instanceof Error
      ? new Error(`Failed to increment simple likes today: ${error.message}`)
      : new Error("An unknown error occurred.");
  }
}

export async function updateUserLevel(userId: string, targetLevel: number) {
  try {
    // Validate userId and targetLevel
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid userId: Must be a non-empty string.");
    }
    if (typeof targetLevel !== "number" || targetLevel < 1) {
      throw new Error("Invalid targetLevel: Must be a positive number.");
    }

    // Fetch current user document to check current level
    const userDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      [Query.select(["level"])]
    );
    if (!userDoc) {
      throw new Error(`User not found for userId: ${userId}`);
    }

    // Check if the user is already at or above the target level
    if (userDoc.level >= targetLevel) {
      return userDoc;
    }

    // Update the user's level directly
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      { level: targetLevel, tier: targetLevel == 6 ? "Gold" : "Silver" }
    );

    return updatedUser;
  } catch (error) {
    console.error("[updateUserLevel] Error:", error);
    throw error instanceof Error
      ? new Error(`Failed to update user level: ${error.message}`)
      : new Error("An unknown error occurred.");
  }
}

//============================================================================================
// In ./services/userService.ts
export async function searchUsersByPrefix(prefix: string, limit: number) {
  const lowerPrefix = prefix.toLowerCase();
  const upperBound = lowerPrefix + "\uf8ff"; // Unicode trick for prefix search
  return databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.userCollectionId,
    [
      Query.greaterThanEqual("name", lowerPrefix),
      Query.lessThan("name", upperBound),
      Query.limit(limit),
    ]
  );
}

export async function getUserByName(name: string) {
  const lowerName = name.toLowerCase();
  const users = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.userCollectionId,
    [Query.equal("name", lowerName)]
  );
  return users.documents[0]; // Assuming names are unique
}

//=====================================================================================================
// New function: Update user reaction settings
export async function updateUserReactions(
  userId: string,
  updates: { isReaction: boolean; expirationDateIsReaction: string | null }
) {
  try {
    // Validate inputs
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid userId: Must be a non-empty string.");
    }
    if (typeof updates.isReaction !== "boolean") {
      throw new Error("Invalid isReaction: Must be a boolean.");
    }
    if (
      updates.expirationDateIsReaction !== null &&
      (typeof updates.expirationDateIsReaction !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(
          updates.expirationDateIsReaction
        ))
    ) {
      throw new Error(
        "Invalid expirationDateIsReaction: Must be a valid ISO date string or null."
      );
    }

    // Verify user exists
    const userDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      [Query.select(["$id"])] // Minimal query to check existence
    );
    if (!userDoc) {
      throw new Error(`User not found for userId: ${userId}`);
    }

    // Prepare update payload
    const updatePayload = {
      isReaction: updates.isReaction,
      expirationDateIsReaction: updates.expirationDateIsReaction,
    };

    // Update user document with reaction settings
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      updatePayload,
      [
        Permission.write(Role.user(userId)), // Restrict update to the user
      ]
    );

    return updatedUser;
  } catch (error) {
    console.error("[updateUserReactions] Error:", {
      message: error instanceof Error ? error.message : String(error),
      code: error instanceof Error ? (error as any).code : undefined,
    });
    throw error instanceof Error
      ? new Error(`Failed to update user reaction settings: ${error.message}`)
      : new Error("An unknown error occurred.");
  }
}

//=====================================================================================================
// New function: Update user ad-free settings
export async function updateUserAdFree(
  userId: string,
  updates: { isAdFree: boolean; expirationDateIsAdFree: string | null }
) {
  try {
    // Validate inputs
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid userId: Must be a non-empty string.");
    }
    if (typeof updates.isAdFree !== "boolean") {
      throw new Error("Invalid isAdFree: Must be a boolean.");
    }
    if (
      updates.expirationDateIsAdFree !== null &&
      (typeof updates.expirationDateIsAdFree !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(
          updates.expirationDateIsAdFree
        ))
    ) {
      throw new Error(
        "Invalid expirationDateIsAdFree: Must be a valid ISO date string or null."
      );
    }

    // Verify user exists
    const userDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      [Query.select(["$id"])] // Minimal query to check existence
    );
    if (!userDoc) {
      throw new Error(`User not found for userId: ${userId}`);
    }

    // Prepare update payload
    const updatePayload = {
      isAdFree: updates.isAdFree,
      expirationDateIsAdFree: updates.expirationDateIsAdFree,
    };

    // Update user document with ad-free settings
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      updatePayload,
      [Permission.update(Role.user(userId))] // Restrict update to the user
    );

    return updatedUser;
  } catch (error) {
    console.error("[updateUserAdFree] Error:", {
      message: error instanceof Error ? error.message : String(error),
      code: error instanceof Error ? (error as any).code : undefined,
    });
    throw error instanceof Error
      ? new Error(`Failed to update user ad-free settings: ${error.message}`)
      : new Error("An unknown error occurred.");
  }
}

//=========================================================== incrementGreatCommentNumber
export async function incrementGreatCommentNumber(userId: string) {
  try {
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid userId: Must be a non-empty string.");
    }

    const userDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      [Query.select(["greatCommentNumber"])]
    );

    if (!userDoc) {
      throw new Error("User not found");
    }

    const greatCommentNumber = (userDoc.greatCommentNumber || 0) + 1;

    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      {
        greatCommentNumber,
      }
    );

    return updatedUser;
  } catch (error) {
    console.error("[incrementGreatCommentNumber] Error:", error);
    throw error instanceof Error
      ? new Error(`Failed to increment great comment number: ${error.message}`)
      : new Error("An unknown error occurred.");
  }
}

//=========================================================== incrementGreatQuestionsNumber
export async function incrementGreatQuestionsNumber(userId: string) {
  try {
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid userId: Must be a non-empty string.");
    }

    const userDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      [Query.select(["greatQuestionsNumber"])]
    );

    if (!userDoc) {
      throw new Error("User not found");
    }

    const greatQuestionsNumber = (userDoc.greatQuestionsNumber || 0) + 1;

    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      {
        greatQuestionsNumber,
      }
    );

    return updatedUser;
  } catch (error) {
    console.error("[incrementGreatQuestionsNumber] Error:", error);
    throw error instanceof Error
      ? new Error(
          `Failed to increment great questions number: ${error.message}`
        )
      : new Error("An unknown error occurred.");
  }
}

//=================================================================================
// Function to send badge notification when a new badge is received
export async function sendBadgeNotification(
  userId: string,
  badgeTitle: string,
  badgeEmoji: string
) {
  try {
    const notificationMessage = `🎉 You received a new badge: ${badgeEmoji} ${badgeTitle}`;

    await createNotification({
      userId,
      type: "NEW_BADGE_RECEIVED",
      message: notificationMessage,
      relatedEntityId: userId, // Points to user profile for badges section
    });
  } catch (error) {
    console.error(
      "[sendBadgeNotification] Error sending badge notification:",
      error
    );
    throw error;
  }
}

//=================================================================================
// Function to send gift notification when a user receives a gift
export async function sendGiftNotification(
  recipientId: string,
  senderName: string,
  giftType: string, // e.g., "flower bouquet", "gift with Qp"
  qpAmount?: number
) {
  try {
    let notificationMessage: string;

    if (qpAmount) {
      notificationMessage = `${senderName} sent you a gift with ${qpAmount} QP! 🎁`;
    } else {
      notificationMessage = `${senderName} sent you a ${giftType}! 💐`;
    }

    await createNotification({
      userId: recipientId,
      type: "GIFT_RECEIVED",
      message: notificationMessage,
      relatedEntityId: recipientId, // Points to recipient's profile
    });
  } catch (error) {
    console.error(
      "[sendGiftNotification] Error sending gift notification:",
      error
    );
    throw error;
  }
}

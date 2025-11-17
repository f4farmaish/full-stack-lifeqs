import { ID, Query } from "appwrite";
import {
  appwriteConfig,
  account,
  databases,
  avatars,
  functions,
} from "@/lib/appwrite/config";
import { INewUser } from "@/types";
import {
  saveUserToDB,
  updateUserLevelAndPoints,
  updateUserOnlineStatus,
} from "./userService";
import { UserAction } from "@/lib/pointsMapping";

//===================== Create a User Account
export async function createUserAccount(user: INewUser) {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    let newAccount = null; // Track if account was created
    try {
      // Check if a user with the same email already exists
      const existingUsers = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        [Query.equal("email", user.email), Query.limit(1)]
      );

      if (existingUsers.documents.length > 0) {
        const error = new Error(
          "This email is already registered. Please use a different email."
        );
        throw error;
      }

      newAccount = await account.create(
        ID.unique(),
        user.email,
        user.password,
        user.name
      );

      if (!newAccount) {
        console.error("Account creation failed for email:", user.email);
        throw new Error("Account creation failed.");
      }

      await account.createEmailSession(user.email, user.password);

      const token = await account.createVerification(
        `${window.location.origin}/verify-email`
      );
      const verificationLink = `${window.location.origin}/verify-email?userId=${token.userId}&secret=${token.secret}`;
      await sendVerificationEmail(user.email, verificationLink);
      await account.deleteSession("current");

      const avatarUrl = avatars.getInitials(user.name).toString(); // Convert URL to string

      const newUser = await saveUserToDB({
        accountId: newAccount.$id,
        name: newAccount.name,
        email: newAccount.email,
        imageUrl: avatarUrl,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        relationshipStatus: user.relationshipStatus,
        occupation: user.occupation,
        educationLevel: user.educationLevel,
        firstName: user.firstName,
        lastName: user.lastName,
        point: 0,
      });

      return newUser;
    } catch (error: any) {
      console.error("Error creating user account:", {
        message: error.message,
        code: error.code,
      });
      if (error.code === 429 || error.code === 0 || !error.code) {
        // Extend retry for rate limit, timeout/network
        attempt++;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
      try {
        await account.deleteSession("current");
      } catch (sessionError) {
        console.warn("No session to clean up:", sessionError);
      }
      if (newAccount) {
        // Delete auth user if created but overall failed
        try {
          await account.createEmailSession(user.email, user.password);
          await account.delete();
        } catch (deleteError) {
          console.error("Failed to delete orphan auth user:", deleteError);
        }
      }
      throw error;
    }
  }
}
//===================== Verify Email
export async function verifyEmail(userId: string, secret: string) {
  try {
    const result = await account.updateVerification(userId, secret);
    return result;
  } catch (error) {
    console.error("Error verifying email:", error);
    throw error;
  }
}

//===================== Resend Verification Email
export async function resendVerificationEmail(email: string, password: string) {
  try {
    await account.createEmailSession(email, password);

    const token = await account.createVerification(
      `${window.location.origin}/verify-email`
    );
    const verificationLink = `${window.location.origin}/verify-email?userId=${token.userId}&secret=${token.secret}`;
    await sendVerificationEmail(email, verificationLink);
    await account.deleteSession("current");

    return { success: true }; // Custom success response since email is sent via Resend
  } catch (error) {
    console.error("Error resending verification email:", error);
    try {
      await account.deleteSession("current");
    } catch (sessionError) {
      console.warn("No session to clean up after resend:", sessionError);
    }
    throw error;
  }
}

//===================== Update User Email
export async function updateUserEmail(
  accountId: string,
  originalEmail: string,
  newEmail: string,
  password: string
) {
  try {
    await account.createEmailSession(originalEmail, password);

    await account.updateEmail(newEmail, password);

    const userDocs = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", accountId)]
    );

    if (userDocs.documents.length === 0) {
      console.error("No user document found for accountId:", accountId);
      throw new Error("User document not found.");
    }

    const userDoc = userDocs.documents[0];
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userDoc.$id,
      { email: newEmail }
    );

    const token = await account.createVerification(
      `${window.location.origin}/verify-email`
    );
    const verificationLink = `${window.location.origin}/verify-email?userId=${token.userId}&secret=${token.secret}`;
    await sendVerificationEmail(newEmail, verificationLink);
    await account.deleteSession("current");

    return { success: true }; // Custom success response
  } catch (error) {
    console.error("Error updating user email:", error);
    try {
      await account.deleteSession("current");
    } catch (sessionError) {
      console.warn("No session to clean up after email update:", sessionError);
    }
    throw error;
  }
}

//===================== Create Password Recovery
export async function createPasswordRecovery(
  email: string,
  redirectUrl: string
) {
  try {
    const result = await account.createRecovery(email, redirectUrl);
    return result;
  } catch (error) {
    console.error("Error creating password recovery:", error);
    throw error;
  }
}

//===================== Update Password Recovery
export async function updatePasswordRecovery(
  userId: string,
  secret: string,
  password: string,
  confirmPassword: string
) {
  try {
    const result = await account.updateRecovery(
      userId,
      secret,
      password,
      confirmPassword
    );
    return result;
  } catch (error) {
    console.error("Error updating password:", error);
    throw error;
  }
}

//===================== Sign In
export async function signInAccount(user: { email: string; password: string }) {
  let session = null;
  try {
    // Clean up any existing sessions to avoid conflicts
    try {
      await account.deleteSession("current");
    } catch (sessionError) {
      console.warn("No existing session to clean up:", sessionError);
    }

    // Create new email session
    session = await account.createEmailSession(user.email, user.password);

    // Verify user account
    const currentAccount = await account.get();
    if (!currentAccount.emailVerification) {
      console.error("Email not verified for user:", currentAccount.$id);
      await account.deleteSession("current");
      throw new Error("Email not verified. Please verify your email first.");
    }

    // Delay to ensure session stability
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Get current user data
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      await account.deleteSession("current");
      throw new Error("User document not found.");
    }

    // Handle suspension logic
    if (currentUser.suspended) {
      const suspensionTime = new Date(currentUser.suspensionTimestamp);
      const now = new Date();

      if (isNaN(suspensionTime.getTime())) {
        console.error(
          "Invalid suspensionTimestamp:",
          currentUser.suspensionTimestamp
        );
        await account.deleteSession("current");
        throw new Error("Invalid suspension timestamp.");
      }

      const diffInDays = Math.floor(
        (now.getTime() - suspensionTime.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffInDays < 14) {
        // Reactivate account
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          currentUser.$id,
          {
            suspended: false,
            suspensionTimestamp: null,
          }
        );
      } else {
        // Trigger deletion via Appwrite Function and throw error
        const execution = await functions.createExecution(
          appwriteConfig.deleteUserFunctionId,
          JSON.stringify({ userId: currentUser.$id })
        );
        throw { message: "Account has been deleted.", code: "ACCOUNT_DELETED" };
      }
    }

    // Update user status
    await updateUserOnlineStatus(currentUser.$id, true);

    return session;
  } catch (error) {
    console.error("Error signing in:", error);
    // Clean up session only if it was created
    if (session) {
      try {
        await account.deleteSession("current");
      } catch (sessionError) {
        console.warn("No session to clean up on error:", sessionError);
      }
    }
    throw error;
  }
}
// ============================== GET ACCOUNT
export async function getAccount() {
  try {
    const currentAccount = await account.get();
    return currentAccount;
  } catch (error: any) {
    if (error.code === 401) {
      // No logging for expected unauthorized access (logged out)
      return null;
    } else {
      console.error("[getAccount] Error:", {
        message: error.message,
        code: error.code,
      });
      throw error;
    }
  }
}

// ============================== GET USER
export async function getCurrentUser() {
  try {
    const currentAccount = await getAccount();

    if (!currentAccount) {
      return null;
    }

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [
        Query.equal("accountId", currentAccount.$id),
        Query.select([
          "$id",
          "name",
          "email",
          "imageUrl",
          "bio",
          "questionsAskedToday",
          "point",
          "lastQuestionReset",
          "lastGreatReset",
          "greatsToday",
          "level",
          "relationshipStatus",
          "occupation",
          "educationLevel",
          "dateOfBirth",
          "gender",
          "suspended",
          "suspensionTimestamp",
          "commentSortBy",
          "notificationPreferences",
          "lastPostDate",
          "postsToday",
          "tier",
          "expirationDateIsReaction",
          "isReaction",
          "isAdFree",
          "expirationDateIsAdFree",
          "emailPreferences",
          "firstName",
          "lastName",
        ]),
      ]
    );

    if (!currentUser || currentUser.documents.length === 0) {
      console.error(
        "No user document found for accountId:",
        currentAccount.$id
      );
      return null;
    }

    const userDoc = currentUser.documents[0];
    return userDoc;
  } catch (error: any) {
    console.error("Error fetching current user:", {
      message: error.message,
      code: error.code,
    });
    return null;
  }
}
//============================== SIGN OUT
export async function signOutAccount() {
  try {
    const session = await account.getSession("current").catch((error) => {
      console.warn(
        "[signOutAccount] No active session found for sign out:",
        error
      );
      return null;
    });

    if (session) {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        try {
          await updateUserOnlineStatus(currentUser.$id, false);
        } catch (statusError) {
          console.warn(
            "[signOutAccount] Failed to update online status:",
            statusError
          );
          // Continue with sign-out despite status update failure
        }
      }

      await account.deleteSession("current");
    } else {
    }

    return { success: true };
  } catch (error) {
    console.error("[signOutAccount] Error during logout:", error);
    throw error;
  }
}
//====================================================================================
export async function signInWithGoogle() {
  try {
    const successUrl = `${window.location.origin}/sign-in`;
    const failureUrl = `${window.location.origin}/sign-in`;

    await account.createOAuth2Session("google", successUrl, failureUrl);
    return true;
  } catch (error: any) {
    console.error("Error during Google OAuth login:", {
      message: error.message,
      code: error.code,
      type: error.type,
    });
    if (error.type === "project_invalid_success_url") {
      throw new Error(
        "Invalid OAuth success URL. Check Appwrite OAuth redirect settings."
      );
    } else if (error.type === "general_argument_invalid") {
      throw new Error("Invalid OAuth configuration. Verify URLs and settings.");
    }
    throw error;
  }
}

//===================== Connexion avec Facebook
export async function signInWithFacebook() {
  try {
    const successUrl = `${window.location.origin}/sign-in`;
    const failureUrl = `${window.location.origin}/sign-in`;

    await account.createOAuth2Session("facebook", successUrl, failureUrl);
    return true;
  } catch (error: any) {
    console.error("Error during Facebook OAuth login:", {
      message: error.message,
      code: error.code,
      type: error.type,
    });
    if (error.type === "project_invalid_success_url") {
      throw new Error(
        "Invalid OAuth success URL. Check Appwrite OAuth redirect settings."
      );
    } else if (error.type === "general_argument_invalid") {
      throw new Error("Invalid OAuth configuration. Verify URLs and settings.");
    }
    throw error;
  }
}

// Lock to prevent concurrent executions
let isOAuthLoginInProgress = false;

// Handle OAuth login and ensure user is added to the users collection
export async function handleOAuthLogin() {
  if (isOAuthLoginInProgress) {
    return false;
  }

  isOAuthLoginInProgress = true;

  try {
    // Verify session exists
    const session = await account.getSession("current").catch(() => null);
    if (!session) {
      return false;
    }

    const currentAccount = await account.get();
    if (!currentAccount) {
      return false;
    }

    const userDocs = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", currentAccount.$id)]
    );

    if (userDocs.documents.length === 0) {
      const avatarUrl = avatars.getInitials(currentAccount.name);
      const fullName = currentAccount.name.trim();
      const nameParts = fullName.split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      // Dans handleOAuthLogin, lorsque newUser est créé
      const newUser = {
        accountId: currentAccount.$id,
        name: '', // Empty nickname to force selection in complete profile
        email: currentAccount.email,
        imageUrl: avatarUrl.toString(), // Convert URL to string
        dateOfBirth: null,
        gender: null,
        relationshipStatus: "",
        occupation: "",
        educationLevel: "",
        firstName,
        lastName,
        point: 0,
        level: 1,
        isOnline: false,
        questionsAskedToday: 0,
        specialBonusesAwarded: [],
      };
      await saveUserToDB(newUser);

      // Award signup points for new OAuth user
      try {
        await updateUserLevelAndPoints(currentAccount.$id, UserAction.SIGNUP);
      } catch (pointsError) {
        console.warn("Failed to award signup points:", pointsError);
      }
    }

    // Update online status
    try {
      await updateUserOnlineStatus(currentAccount.$id, true);
    } catch (statusError) {
      console.warn("Failed to update online status:", statusError);
    }

    return true;
  } catch (error: any) {
    console.error("Error in handleOAuthLogin:", {
      message: error.message,
      code: error.code,
    });
    return false;
  } finally {
    isOAuthLoginInProgress = false;
  }
}
//============================================================================================
export async function updateUserPassword(
  currentPassword: string,
  newPassword: string
) {
  try {
    await account.updatePassword(newPassword, currentPassword);
    return true;
  } catch (error) {
    console.error("Error updating user password:", error);
    throw error;
  }
}

export async function sendVerificationEmail(
  email: string,
  verificationLink: string
) {
  try {
    const response = await fetch(
      "http://localhost:3000/api/send-verification-email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, verificationLink }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Backend email send failed:", errorData);
      throw new Error("Failed to send verification email via backend");
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error in sendVerificationEmail:", {
      message: error.message,
    });
    throw error;
  }
}
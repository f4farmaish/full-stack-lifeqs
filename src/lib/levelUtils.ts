import { IUser } from "@/types";

// Define level thresholds
const LEVEL_THRESHOLDS = [
  { level: 0, name: "Default", minPoints: 0, maxPoints: 499, postsPer24h: 2 },
  { level: 1, name: "Explorer", minPoints: 500, maxPoints: 1199, postsPer24h: 2 },
  { level: 2, name: "Contributor", minPoints: 1200, maxPoints: 2499, postsPer24h: 3 },
  { level: 3, name: "Expert", minPoints: 2500, maxPoints: 4999, postsPer24h: 3 },
  { level: 4, name: "Influencer", minPoints: 5000, maxPoints: Infinity, postsPer24h: 4 },
  // Special tiers (bought using QWallet, not QP-based)
  { level: 5, name: "Silver", minPoints: -1, maxPoints: Infinity, postsPer24h: 3 }, // level -1 to indicate special tier
  { level: 6, name: "Gold", minPoints: -1, maxPoints: Infinity, postsPer24h: 4 },   // level -2 for Gold
  { level: 7, name: "Sponsored", minPoints: -1, maxPoints: Infinity, postsPer24h: Infinity }, // level -3 for Sponsored
];

// 1. Map user points to level, considering special tiers
export function getUserLevelFromPoints(user: any): number {
  const points = user.point ;
  const tier = user.tier ; // Assuming user.tier indicates Silver, Gold, or Sponsored

  // Check for special tiers first (bought using QWallet)
  if (tier === "Sponsored") return 7;
  if (tier === "Gold") return 6;
  if (tier === "Silver") return 6;

  // QP-based levels
  if (points >= 5000) return 4; // Influencer
  if (points >= 2500) return 3; // Expert
  if (points >= 1200) return 2; // Contributor
  if (points >= 500) return 1;  // Explorer
  return 0;                     // Default
}

// 2. Get max points for a given level
export function getMaxPointsForLevel(level: number): number {
  const levelData = LEVEL_THRESHOLDS.find((l) => l.level === level);
  return levelData?.maxPoints || 499; // Default to first level's max
}

// 3. Get level name
export function getLevelName(level: number): string {
  const levelData = LEVEL_THRESHOLDS.find((l) => l.level === level);
  return levelData?.name || "Default"; // Default to Default
}

// 4. Check if user can perform a certain action based on their level and perks
export function canUserPerformAction(user: IUser, action: string): boolean {
  const level = getUserLevelFromPoints(user);
  const isSponsored = level === 7; // Sponsored tier
  const isGold = level === 6;      // Gold tier
  const isSilver = level === 5;    // Silver tier

  // Reset postsToday if lastPostDate is not today
  const today = new Date().toDateString();
  if (user.lastPostDate && user.lastPostDate !== today) {
    user.postsToday = 0; // Reset counter if last post was not today
  }

  // Define permissions based on level or tier
  const canSendPrivateMessages = level >= 1 || isSilver || isGold; // Explorer and above, Silver, Gold
  const canApplyForGroups = level >= 1 || isSilver || isGold;      // Explorer and above, Silver, Gold
  const canCreateGroups = level >= 2 || isSilver || isGold;        // Contributor and above, Silver, Gold
  const canUseExtraReactionsForComments = level >= 2 || isSilver || isGold; // Contributor and above, Silver, Gold
  const canUseExtraReactionsForPosts = level >= 3 || isSilver || isGold;   // Expert and above, Silver, Gold
  const canHighlightQuestionPoll = level >= 4 || isGold;          // Influencer and Gold
  const isAdFree = level >= 4 || isGold;                          // Influencer and Gold

  // Get posts per 24h limit
  const levelData = LEVEL_THRESHOLDS.find((l) => l.level === level);
  const dailyPostLimit : any  = levelData?.postsPer24h ; // Default to 2


  // Check for specific actions
  switch (action) {
    case "ADD_POST":
      return user.postsToday < dailyPostLimit ; // Sponsored accounts can't post non-ads

    case "ADD_ADVERTISEMENT":
      return isSponsored; // Only Sponsored accounts can post ads

    case "SEND_PRIVATE_MESSAGE":
      return canSendPrivateMessages && !isSponsored;

    case "APPLY_FOR_GROUP":
      return canApplyForGroups && !isSponsored;

    case "CREATE_GROUP":
      return canCreateGroups && !isSponsored;

    case "USE_EXTRA_REACTION_COMMENT":
      return canUseExtraReactionsForComments && !isSponsored;

    case "USE_EXTRA_REACTION_POST":
      // Check daily limit for reactions on posts (max 2 per day for Expert, Silver, Gold)
      if (canUseExtraReactionsForPosts && user.reactionsOnPostsToday < 2 && !isSponsored) {
        return true;
      }
      return false;

    case "HIGHLIGHT_QUESTION_POLL":
      // Check daily limit for highlighting (max 1 per day for Influencer, Gold)
      if (canHighlightQuestionPoll && user.highlightsToday < 1 && !isSponsored) {
        return true;
      }
      return false;

    case "COMMENT":
    case "UPVOTE":
      return !isSponsored; // Sponsored accounts can't comment or upvote

    // Add other actions as necessary
  }

  // Default to true if no specific restrictions
  return true;
}
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const convertFileToUrl = (file: File) => URL.createObjectURL(file);

export function formatDateString(dateString: string) {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  const date = new Date(dateString);
  const formattedDate = date.toLocaleDateString("en-US", options);

  const time = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formattedDate} at ${time}`;
}

// 
export const multiFormatDateString = (timestamp: string = ""): string => {
  const timestampNum = Math.round(new Date(timestamp).getTime() / 1000);
  const date: Date = new Date(timestampNum * 1000);
  const now: Date = new Date();

  const diff: number = now.getTime() - date.getTime();
  const diffInSeconds: number = diff / 1000;
  const diffInMinutes: number = diffInSeconds / 60;
  const diffInHours: number = diffInMinutes / 60;
  const diffInDays: number = diffInHours / 24;

  switch (true) {
    case Math.floor(diffInDays) >= 30:
      return formatDateString(timestamp);
    case Math.floor(diffInDays) === 1:
      return `${Math.floor(diffInDays)} day ago`;
    case Math.floor(diffInDays) > 1 && diffInDays < 30:
      return `${Math.floor(diffInDays)} days ago`;
    case Math.floor(diffInHours) >= 1:
      return `${Math.floor(diffInHours)} hours ago`;
    case Math.floor(diffInMinutes) >= 1:
      return `${Math.floor(diffInMinutes)} minutes ago`;
    default:
      return "Just now";
  }
};

export const checkIsLiked = (likeList: string[], userId: string) => {
  return likeList.includes(userId);
};

export const generateChatId = (userA: string, userB: string): string => {
  return [userA, userB].sort().join('_'); // toujours le même
};




// Calculate and format the time difference between now and a given date
export const formatTimeDifference: FormatTimeDifference = (
  date: string | null,
  options = {}
) => {
  const { excludeAgo = false } = options;

  if (!date) return "Unknown";

  const now = new Date();
  const past = new Date(date);
  const diffInMs = now.getTime() - past.getTime();

  // Handle registration date (e.g., "2 years and 5 months" or "2 years and 5 months ago")
  if (diffInMs > 1000 * 60 * 60 * 24 * 30 * 12) {
    // More than a year
    const years = Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 30 * 12));
    const months = Math.floor(
      (diffInMs % (1000 * 60 * 60 * 24 * 30 * 12)) / (1000 * 60 * 60 * 24 * 30)
    );
    let result = `${years} year${years > 1 ? "s" : ""}`;
    if (months > 0) {
      result = `${years} year${years > 1 ? "s" : ""} and ${months} month${months > 1 ? "s" : ""}`;
    }
    return excludeAgo ? result : `${result} ago`;
  } else if (diffInMs > 1000 * 60 * 60 * 24 * 30) {
    // More than a month
    const months = Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 30));
    return `${months} month${months > 1 ? "s" : ""}${excludeAgo ? "" : " ago"}`;
  } else if (diffInMs > 1000 * 60 * 60 * 24 * 7) {
    // More than a week
    const weeks = Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 7));
    return `${weeks} week${weeks > 1 ? "s" : ""}${excludeAgo ? "" : " ago"}`;
  } else if (diffInMs > 1000 * 60 * 60 * 24) {
    // More than a day
    const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    return `${days} day${days > 1 ? "s" : ""}${excludeAgo ? "" : " ago"}`;
  } else if (diffInMs > 1000 * 60 * 60) {
    // More than an hour
    const hours = Math.floor(diffInMs / (1000 * 60 * 60));
    return `${hours} hour${hours > 1 ? "s" : ""}${excludeAgo ? "" : " ago"}`;
  } else if (diffInMs > 1000 * 60) {
    // Less than an hour
    const minutes = Math.floor(diffInMs / (1000 * 60));
    return `${minutes} minute${minutes > 1 ? "s" : ""}${excludeAgo ? "" : " ago"}`;
  } else {
    return excludeAgo ? "a few seconds" : "a few seconds ago";
  }
};
//===============================================================================
import { FormatTimeDifference, IUser } from "@/types";

export function isProfileComplete(user: IUser): boolean {
  return !!user.dateOfBirth && !!user.gender && !!user.relationshipStatus && !!user.occupation && !!user.educationLevel;
}
//========================================================================================================

export const formatDateForInput = (date: string | null | undefined): string => {
  if (!date) return "";
  try {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return "";
    return parsedDate.toISOString().split("T")[0]; // Converts to YYYY-MM-DD
  } catch (error) {
    console.error("Error formatting dateOfBirth:", error);
    return "";
  }
};


// Utility function to escape special characters for regex
export function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

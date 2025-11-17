import React from "react";
import { UserDetails } from "@/types";

type ColoredAvatarProps = {
  user?: UserDetails;
  sizeClass?: string;
  className?: string;
};

const ColoredAvatar: React.FC<ColoredAvatarProps> = ({
  user,
  sizeClass = "w-28 h-28 lg:h-36 lg:w-36",
  className = "",
}) => {
  const defaultImage = "/assets/icons/profile-placeholder.svg";
  const defaultBorderColor = "#E0E0E0"; // Gray for fallback

  if (!user) {
    return (
      <div
        className={`relative ${sizeClass} rounded-full flex items-center justify-center ${className}`}
        style={{ border: `3px solid ${defaultBorderColor}` }}
      >
        <img
          src={defaultImage}
          alt="Placeholder profile"
          className="w-full h-full rounded-full object-cover"
        />
      </div>
    );
  }

  const borderColor =
    user.level === 6
      ? "#FFD700" // Gold for level 6
      : user.level === 5
      ? "#C0C0C0" // Silver for level 5
      : user.gender === "F"
      ? "#FA25CB" // Pink for female
      : user.gender === "M"
      ? "#5291E1" // Blue for male
      : defaultBorderColor; // Gray for null/unknown



  return (
    <div
      className={`relative ${sizeClass} rounded-full flex items-center justify-center ${className}`}
      style={{ border: `3px solid ${borderColor}` }}
    >
      <img
        src={user.imageUrl || defaultImage}
        alt={`Profile picture of ${user.name || "User"}`}
        className="w-full h-full rounded-full object-cover"
      />
    </div>
  );
};

export default ColoredAvatar;

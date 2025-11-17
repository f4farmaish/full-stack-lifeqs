interface LevelPermissions {
  perks: string[];
  postsPer24h: number;
  level: number;
  qpRange: { min: number; max: number };
}

export const levelPermissions: LevelPermissions[] = [
    {
    level: 0,
    perks: ["Create basic posts", "Comment on posts"],
    postsPer24h: 2,
    qpRange: { min: 0, max: 200 }
  },
  {
    level: 1,
    perks: ["Create basic posts", "Comment on posts", "Join public groups"],
    postsPer24h: 2,
    qpRange: { min: 0, max: 200 }
  },
  {
    level: 2,
    perks: ["Create unlimited posts", "Send private messages", "Join private groups"],
    postsPer24h: 3,
    qpRange: { min: 200, max: 600 }
  },
  {
    level: 3,
    perks: ["Create private groups", "Moderate posts", "Access premium features"],
    postsPer24h: 3,
    qpRange: { min: 600, max: 1500 }
  },
  {
    level: 4,
    perks: ["Highlight questions", "Access exclusive content", "Advanced moderation"],
    postsPer24h: 4,
    qpRange: { min: 1500, max: 3000 }
  },
  {
    level: 5,
    perks: ["All premium features", "Priority support", "Custom badges"],
    postsPer24h: 999,
    qpRange: { min: 3000, max: Infinity }
  }
];

export function getPermissionsForLevel(level: number): LevelPermissions {
  return levelPermissions.find(perm => perm.level === level) || levelPermissions[0];
}

// src/constants/badges.ts

export interface Badge {
  key: string;
  title: string;
  description: string;
  emoji: string;
  criteria: {
    type: 'membership_duration' | 'great_comments' | 'great_questions' | 'opinions_replies_week' | 'likes_given_week' | 'questions_asked' | 'polls_participated' | 'likes_received' | 'login_days';
    threshold: number;
    unit?: 'years' | 'days' | 'count';
  };
}

export const badges: Badge[] = [
  {
    key: 'one_year_club',
    title: '1 Year Club',
    description: 'Has been a member for 1 year',
    emoji: '🏆',
    criteria: {
      type: 'membership_duration',
      threshold: 1,
      unit: 'years',
    },
  },
  {
    key: 'two_year_club',
    title: '2 Year Club',
    description: 'Has been a member for 2 years',
    emoji: '🏆',
    criteria: {
      type: 'membership_duration',
      threshold: 2,
      unit: 'years',
    },
  },
  // Add more year clubs as needed, e.g., for 3, 4, etc.
  {
    key: 'insightful',
    title: 'Insightful',
    description: 'Had 20+ comments marked as "Great"',
    emoji: '💡',
    criteria: {
      type: 'great_comments',
      threshold: 20,
      unit: 'count',
    },
  },
  {
    key: 'great_thinker',
    title: 'Great Thinker',
    description: 'Had 20+ questions marked as "Great"',
    emoji: '🧠',
    criteria: {
      type: 'great_questions',
      threshold: 20,
      unit: 'count',
    },
  },
  {
    key: 'social_butterfly',
    title: 'Social Butterfly',
    description: 'Add 50 opinions and replies in a week',
    emoji: '🦋',
    criteria: {
      type: 'opinions_replies_week',
      threshold: 50,
      unit: 'count',
    },
  },
  {
    key: 'super_supporter',
    title: 'Super Supporter',
    description: 'Gave 50 likes to questions, polls in the last 7 days',
    emoji: '👍',
    criteria: {
      type: 'likes_given_week',
      threshold: 50,
      unit: 'count',
    },
  },
  {
    key: 'explorer',
    title: 'Explorer',
    description: 'Asked 20+ Questions',
    emoji: '🧭',
    criteria: {
      type: 'questions_asked',
      threshold: 20,
      unit: 'count',
    },
  },
  {
    key: 'opinion_leader',
    title: 'Opinion Leader',
    description: 'Participated in 50+ Polls',
    emoji: '📣',
    criteria: {
      type: 'polls_participated',
      threshold: 50,
      unit: 'count',
    },
  },
  {
    key: 'community_helper',
    title: 'Community Helper',
    description: 'Received 300+ total likes on posts & comments',
    emoji: '🤝',
    criteria: {
      type: 'likes_received',
      threshold: 300,
      unit: 'count',
    },
  },
  {
    key: 'dedicated_member',
    title: 'Dedicated Member',
    description: 'Logged in for total 180 days',
    emoji: '📅',
    criteria: {
      type: 'login_days',
      threshold: 180,
      unit: 'days',
    },
  },
];
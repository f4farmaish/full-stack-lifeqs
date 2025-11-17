export interface QPShopCard {
  id: string;
  title: string;
  cost: number;
  duration: 'forever' | '7days' | '1week' | '1month' | 'instant';
  description: string;
  limit?: string;
  isGift?: boolean;
}

export const qpShopCards: QPShopCard[] = [
  {
    id: 'custom-profile',
    title: 'Custom Profile Features',
    cost: 500,
    duration: 'forever',
    description: 'Unlock profile themes, background picture, etc.',
  },
  {
    id: 'likes',
    title: 'Likes for Posts (Red Heart)',
    cost: 100,
    duration: '7days',
    description: 'Use "like" (red heart) for a post to give extra attention or approval.',
    limit: 'Max 2 per day',
  },
  {
    id: 'super-likes',
    title: 'Super-Likes for Posts (Golden Heart)',
    cost: 150,
    duration: '7days',
    description: 'Use "Super-Like" (golden heart) for a post to give extra attention or approval.',
    limit: 'Max 2 per day',
  },
  {
    id: 'username-colors',
    title: 'Exclusive Username Colors',
    cost: 50,
    duration: '1week',
    description: 'Buy unique colors (10 colors) for border around picture (except Gold and Silver).',
  },
  {
    id: 'gift-100',
    title: 'Gifting 100 Qp to Other Users',
    cost: 100,
    duration: 'instant',
    description: 'Send 100 Qp to other users as a gift or reward for their contributions.',
    isGift: true,
    limit: 'Up to 500 Qp per day',
  },
  {
    id: 'gift-300',
    title: 'Gifting 300 Qp to Other Users',
    cost: 300,
    duration: 'instant',
    description: 'Send 300 Qp to other users as a gift or reward for their contributions.',
    isGift: true,
    limit: 'Up to 500 Qp per day',
  },
  {
    id: 'gift-500',
    title: 'Gifting 500 Qp to Other Users',
    cost: 500,
    duration: 'instant',
    description: 'Send 500 Qp to other users as a gift or reward for their contributions.',
    isGift: true,
    limit: 'Up to 500 Qp per day',
  },
  {
    id: 'advertisement',
    title: 'Monthly Business Advertisement',
    cost: 500,
    duration: '1month',
    description: 'Use to post a one-time advertisement for a small business once a month.',
  },
];
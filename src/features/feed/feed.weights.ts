export const FeedWeights = {
  // Proximity: Exponential decay scale in meters
  distanceScale: 3000,

  // Popularity: Logarithmic multipliers for raw engagement counts
  engagement: {
    clicks: 0.3,
    saves: 2.0,
    shares: 1.0,
    messages: 3.0,
    hides: -5.0,
    reports: -20.0,
  },

  // Freshness: Gravity exponent for time decay of popularity
  gravity: 1.5,

  // Trust: Multipliers based on verification status
  verification: {
    VERIFIED: 1.15,
    PENDING: 1.03,
    UNVERIFIED: 1.0,
    REJECTED: 0.85,
  },

  // Personalization: Additive bonus for followed entities and explicit interests
  followBonus: 2.0,
  interestBonus: 1.5,

  // Exploration: Bonus for brand new items (within X days) to solve cold-start
  exploration: {
    newDaysThreshold: 7,
    newBonus: 1.5,
    randomJitter: 0.5, // max random score added
  },
} as const;

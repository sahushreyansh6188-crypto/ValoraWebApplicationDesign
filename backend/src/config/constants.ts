export const VALUES_OPTIONS = [
  'authenticity',
  'growth',
  'community',
  'creativity',
  'independence',
  'security',
  'adventure',
  'spirituality',
  'curiosity',
  'compassion',
  'loyalty',
  'humor',
  'ambition',
  'simplicity',
  'justice',
] as const;

export const LIFESTYLE_OPTIONS = [
  'alcohol-free',
  'sober',
  'vegan',
  'plant-based',
  'zero-waste',
  'sustainability',
  'outdoor',
  'homebody',
  'travel',
  'pets',
  'child-free',
  'parent',
  'mindfulness',
  'fitness',
  'arts',
] as const;

export const COMM_OPTIONS = [
  'direct',
  'processing',
  'text-first',
  'calls',
  'low-phone',
  'long-convos',
  'quality-time',
  'needs-space',
] as const;

export const BOUNDARY_OPTIONS = [
  'slow-dating',
  'no-hookups',
  'lgbtq',
  'poly-open',
  'monogamy',
  'long-distance',
  'no-long-distance',
  'privacy',
  'religious',
] as const;

export type ValueOption = (typeof VALUES_OPTIONS)[number];
export type LifestyleOption = (typeof LIFESTYLE_OPTIONS)[number];
export type CommOption = (typeof COMM_OPTIONS)[number];
export type BoundaryOption = (typeof BOUNDARY_OPTIONS)[number];

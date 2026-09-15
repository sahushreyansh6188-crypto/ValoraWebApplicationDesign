export interface ScoringWeights {
  valuesWeight: number;       // default 0.40
  lifestyleWeight: number;    // default 0.30
  communicationWeight: number;// default 0.15
  boundariesWeight: number;   // default 0.15
}

export const defaultScoringWeights: ScoringWeights = {
  valuesWeight: 0.40,
  lifestyleWeight: 0.30,
  communicationWeight: 0.15,
  boundariesWeight: 0.15,
};

/**
 * Calculates Jaccard similarity between two sets: |A ∩ B| / |A ∪ B|
 */
export function calculateJaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1.0;
  const setA = new Set(a.map((s) => s.toLowerCase().trim()));
  const setB = new Set(b.map((s) => s.toLowerCase().trim()));
  let intersectionCount = 0;

  for (const item of setA) {
    if (setB.has(item)) intersectionCount++;
  }

  const unionCount = new Set([...setA, ...setB]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Checks for hard boundary conflicts (e.g., monogamy vs poly-open)
 */
export function checkBoundaryConflict(boundariesA: string[], boundariesB: string[]): boolean {
  const bA = new Set(boundariesA.map((s) => s.toLowerCase()));
  const bB = new Set(boundariesB.map((s) => s.toLowerCase()));

  // Monogamy only vs Open to polyamory
  if (
    (bA.has('monogamy') && bB.has('poly-open')) ||
    (bA.has('poly-open') && bB.has('monogamy'))
  ) {
    return true;
  }

  // Local connections only vs Open to long distance
  if (
    (bA.has('no-long-distance') && bB.has('long-distance')) ||
    (bA.has('long-distance') && bB.has('no-long-distance'))
  ) {
    // Soft conflict, not fatal, but noted
  }

  return false;
}

/**
 * Computes composite compatibility score (0 to 100)
 */
export function calculateCompatibilityScore(
  userA: { values: string[]; lifestyle: string[]; communicationStyle: string[]; boundaries: string[] },
  userB: { values: string[]; lifestyle: string[]; communicationStyle: string[]; boundaries: string[] },
  weights: ScoringWeights = defaultScoringWeights
): {
  score: number;
  sharedValues: string[];
  sharedLifestyle: string[];
  sharedComm: string[];
  hasConflict: boolean;
} {
  const setValuesB = new Set(userB.values.map((v) => v.toLowerCase().trim()));
  const sharedValues = userA.values.filter((v) => setValuesB.has(v.toLowerCase().trim()));

  const setLifeB = new Set(userB.lifestyle.map((l) => l.toLowerCase().trim()));
  const sharedLifestyle = userA.lifestyle.filter((l) => setLifeB.has(l.toLowerCase().trim()));

  const setCommB = new Set(userB.communicationStyle.map((c) => c.toLowerCase().trim()));
  const sharedComm = userA.communicationStyle.filter((c) => setCommB.has(c.toLowerCase().trim()));

  const hasConflict = checkBoundaryConflict(userA.boundaries, userB.boundaries);

  const valuesSim = calculateJaccard(userA.values, userB.values);
  const lifestyleSim = calculateJaccard(userA.lifestyle, userB.lifestyle);
  const commSim = calculateJaccard(userA.communicationStyle, userB.communicationStyle);
  const boundarySim = calculateJaccard(userA.boundaries, userB.boundaries);

  let rawScore =
    valuesSim * weights.valuesWeight +
    lifestyleSim * weights.lifestyleWeight +
    commSim * weights.communicationWeight +
    boundarySim * weights.boundariesWeight;

  if (hasConflict) {
    // Apply boundary penalty
    rawScore *= 0.5;
  }

  // Normalize to 50-98 range for realistic values-first presentation if overlap exists
  let finalScore = Math.round(rawScore * 100);
  if (sharedValues.length > 0 || sharedLifestyle.length > 0) {
    finalScore = Math.max(65, Math.min(98, finalScore + 25));
  } else {
    finalScore = Math.max(40, Math.min(65, finalScore));
  }

  return {
    score: finalScore,
    sharedValues,
    sharedLifestyle,
    sharedComm,
    hasConflict,
  };
}

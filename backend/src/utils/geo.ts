/**
 * Haversine formula to compute great-circle distance between two coordinates in miles
 */
export function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Built-in coordinate mapping for common mock profile locations
 * so local development does not require a paid third-party geocoding API.
 */
export const MOCK_LOCATION_COORDINATES: Record<string, { lat: number; lon: number }> = {
  'portland, or': { lat: 45.5152, lon: -122.6784 },
  'seattle, wa': { lat: 47.6062, lon: -122.3321 },
  'oakland, ca': { lat: 37.8044, lon: -122.2712 },
  'denver, co': { lat: 39.7392, lon: -104.9903 },
  'austin, tx': { lat: 30.2672, lon: -97.7431 },
  'san francisco, ca': { lat: 37.7749, lon: -122.4194 },
};

export function resolveCoordinates(locationText: string): { lat: number; lon: number } {
  const normalized = locationText.toLowerCase().trim();
  for (const [key, coords] of Object.entries(MOCK_LOCATION_COORDINATES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return coords;
    }
  }
  // Default to Portland, OR coordinates as fallback
  return { lat: 45.5152, lon: -122.6784 };
}

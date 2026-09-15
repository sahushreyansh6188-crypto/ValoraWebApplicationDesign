export interface FrontendUserProfile {
  id: string;
  name: string;
  age: number;
  pronouns: string;
  location: string;
  occupation: string;
  bio: string;
  photo: string;
  photos: string[];
  lifestyle: string[];
  values: string[];
  communicationStyle: string[];
  boundaries: string[];
  lookingFor: string;
  compatibilityScore: number;
  lastActive?: string;
}

export function serializeProfile(
  profile: any,
  compatibilityScore = 80
): FrontendUserProfile {
  const photos = (profile.photos || []).map((p: any) => p.photoUrl || p);
  const primaryPhoto =
    profile.avatarUrl ||
    (photos.length > 0 ? photos[0] : 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=500&fit=crop&auto=format');

  const attributes = profile.attributes || [];
  const lifestyle = attributes
    .filter((a: any) => a.category === 'lifestyle')
    .map((a: any) => a.attributeKey);
  const values = attributes
    .filter((a: any) => a.category === 'value')
    .map((a: any) => a.attributeKey);
  const communicationStyle = attributes
    .filter((a: any) => a.category === 'communication')
    .map((a: any) => a.attributeKey);
  const boundaries = attributes
    .filter((a: any) => a.category === 'boundary')
    .map((a: any) => a.attributeKey);

  // Format relative last active
  let lastActive = 'Today';
  if (profile.lastActiveAt) {
    const diffHours = (Date.now() - new Date(profile.lastActiveAt).getTime()) / (1000 * 60 * 60);
    if (diffHours > 48) {
      lastActive = `${Math.floor(diffHours / 24)} days ago`;
    } else if (diffHours > 24) {
      lastActive = 'Yesterday';
    }
  }

  return {
    id: profile.userId || profile.id,
    name: profile.name || '',
    age: profile.age || 28,
    pronouns: profile.pronouns || '',
    location: profile.location || '',
    occupation: profile.occupation || '',
    bio: profile.bio || '',
    photo: primaryPhoto,
    photos: photos.length > 0 ? photos : [primaryPhoto],
    lifestyle,
    values,
    communicationStyle,
    boundaries,
    lookingFor: profile.lookingFor || 'A meaningful, long-term relationship',
    compatibilityScore,
    lastActive,
  };
}

export type Screen =
  | 'landing' | 'auth' | 'onboarding'
  | 'discover' | 'matches' | 'messages'
  | 'notifications' | 'my-profile' | 'settings' | 'admin';

export type AuthMode = 'login' | 'signup' | 'reset' | 'verify';

export type NavigateFn = (screen: Screen) => void;

export interface UserProfile {
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

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  profile: UserProfile;
  messages: Message[];
  matchedAt: string;
  isNew?: boolean;
  unreadCount?: number;
}

export interface Notification {
  id: string;
  type: 'match' | 'message' | 'system';
  text: string;
  time: string;
  read: boolean;
  profileId?: string;
}

export type ActivityType =
  | 'match'
  | 'profile_update'
  | 'values_update'
  | 'photo_update'
  | 'prompt_answered'
  | 'reach_out';

export interface ActivityFeedItem {
  id: string;
  type: ActivityType;
  actorId: string;
  actorName: string;
  actorPhoto?: string;
  actorPronouns?: string;
  actorLocation?: string;
  targetId?: string;
  targetName?: string;
  targetPhoto?: string;
  targetLocation?: string;
  title: string;
  description?: string;
  compatibilityScore?: number;
  tags?: string[];
  timestamp: string;
  likesCount?: number;
  liked?: boolean;
}

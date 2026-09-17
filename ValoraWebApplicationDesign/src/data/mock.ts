import type { UserProfile, Conversation, Notification } from "../types";

export const currentUser: UserProfile = {
  id: "",
  name: "",
  age: 0,
  pronouns: "",
  location: "",
  occupation: "",
  bio: "",
  photo: "",
  photos: [],
  lifestyle: [],
  values: [],
  communicationStyle: [],
  boundaries: [],
  lookingFor: "",
  compatibilityScore: 100,
};

// Clean default state: No dummy profiles. Only real profiles registered by users are shown.
export const profiles: UserProfile[] = [];

export const matches: UserProfile[] = [];

export const conversations: Conversation[] = [];

export const notifications: Notification[] = [];

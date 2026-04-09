export type UserRole = 'USER' | 'STATION_OWNER' | 'ADMIN';

export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  phoneNumber?: string;
  role: UserRole;
  preferredLocale: string;
  createdAt: string;
  updatedAt: string;
}

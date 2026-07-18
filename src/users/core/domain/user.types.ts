export type PlatformRole = 'USER' | 'MODERATOR' | 'ADMIN';

export interface UserEntity {
  id: string;
  accountId: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  email: string;
  role: PlatformRole;
  avatarUrl: string | null;
  businessId?: string | null;
  activeExplorationLat?: number | null;
  activeExplorationLng?: number | null;
  activeExplorationName?: string | null;
  interestedCategories?: string[];
  createdAt: Date;
  updatedAt: Date;
}

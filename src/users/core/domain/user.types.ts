export type PlatformRole = 'USER' | 'MODERATOR' | 'ADMIN';
export type UserStatusType = 'ACTIVE' | 'PENDING_DELETION';

export interface UserEntity {
  id: string;
  accountId: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  email: string;
  role: PlatformRole;
  status: UserStatusType;
  deletedAt: Date | null;
  avatarUrl: string | null;
  businessId?: string | null;
  explorationLat?: number | null;
  explorationLng?: number | null;
  interestedCategories?: string[];
  createdAt: Date;
  updatedAt: Date;
}

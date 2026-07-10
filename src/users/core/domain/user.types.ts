export type PlatformRole = 'USER' | 'MODERATOR' | 'ADMIN';

export interface UserEntity {
  id: string;
  accountId: string;
  username: string;
  email: string;
  role: PlatformRole;
  avatarUrl: string | null;
  avatarId: string | null;
  businessId?: string | null;
  activeExplorationLat?: number | null;
  activeExplorationLng?: number | null;
  activeExplorationName?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationViewDto {
  id!: string;
  category!: string;
  title!: string;
  subtitle?: string;
  icon?: string;
  actionUrl?: string;
  isRead!: boolean;
  createdAt!: Date;
}

export class PaginatedNotificationsDto {
  items!: NotificationViewDto[];
  nextCursor?: string;
  hasMore!: boolean;
}

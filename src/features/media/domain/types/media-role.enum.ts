/**
 * Semantic role of a media item within its parent resource.
 *
 * Constraints:
 *   LOGO   — BusinessProfile only. Singleton (max 1 per profile).
 *   BANNER — BusinessProfile only. Singleton (max 1 per profile).
 *   COVER  — Listing only. Singleton (max 1 per listing).
 *   GALLERY — Both resource types. Multiple items. Reorderable.
 *
 * Singleton roles have order = null.
 * GALLERY items have a contiguous 0-based order value.
 */
export const MediaRole = {
  LOGO: 'LOGO',
  BANNER: 'BANNER',
  COVER: 'COVER',
  GALLERY: 'GALLERY',
  AVATAR: 'AVATAR',
  MESSAGE: 'MESSAGE',
} as const;

export type MediaRole = (typeof MediaRole)[keyof typeof MediaRole];

/** Roles that are singletons — at most one per resource. */
export const SINGLETON_ROLES: ReadonlySet<MediaRole> = new Set([
  MediaRole.LOGO,
  MediaRole.BANNER,
  MediaRole.COVER,
  MediaRole.AVATAR,
]);

/** Valid roles per resource foreign key. */
export const ROLES_BY_FK_NAME: Record<string, ReadonlySet<MediaRole>> = {
  businessProfileId: new Set([MediaRole.LOGO, MediaRole.BANNER, MediaRole.GALLERY]),
  listingId: new Set([MediaRole.COVER, MediaRole.GALLERY]),
  businessTourId: new Set([MediaRole.GALLERY]),
  // Reviews only support raw gallery photos — no logo, banner, or cover slots.
  reviewId: new Set([MediaRole.GALLERY]),
  userId: new Set([MediaRole.AVATAR]),
  conversationId: new Set([MediaRole.MESSAGE]),
  messageId: new Set([MediaRole.MESSAGE]),
  opportunityPostId: new Set([MediaRole.GALLERY]),
};

import { UserProfile, FirebaseEvent } from '@/types/models';

export const ADMIN_ROLES = [
  'admin',
  'super_admin',
  'superadmin',
  'dev',
  'event_admin',
] as const;

/**
 * Extracts and normalizes all roles from user profile (both .roles array and .role string).
 */
export function getUserRoles(user: UserProfile | null | undefined): string[] {
  if (!user) return [];
  const set = new Set<string>();

  if (Array.isArray(user.roles)) {
    user.roles.forEach((r) => {
      if (typeof r === 'string' && r.trim()) {
        set.add(r.trim().toLowerCase());
      }
    });
  }

  if (typeof user.role === 'string' && user.role.trim()) {
    set.add(user.role.trim().toLowerCase());
  }

  return Array.from(set);
}

/**
 * Checks if user has any administrative or elevated management role.
 */
export function isUserAdmin(user: UserProfile | null | undefined): boolean {
  const roles = getUserRoles(user);
  return roles.some((r) => r !== 'user');
}

/**
 * Checks if user has any of the allowed roles.
 */
export function hasAnyRole(
  user: UserProfile | null | undefined,
  allowedRoles: string[]
): boolean {
  const roles = getUserRoles(user);
  const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase().trim());
  return roles.some((r) => normalizedAllowed.includes(r));
}

/**
 * Checks if user has permission to edit a specific event.
 * True if:
 * 1. User has admin/event_admin/super_admin/dev role.
 * 2. User is an assigned coordinator of this event (by email or userId).
 */
export function canUserEditEvent(
  user: UserProfile | null | undefined,
  event: FirebaseEvent | null | undefined
): boolean {
  if (!user || !event) return false;

  const roles = getUserRoles(user);
  if (
    roles.some((r) =>
      ['admin', 'event_admin', 'super_admin', 'superadmin', 'dev'].includes(r)
    )
  ) {
    return true;
  }

  const userEmail = (user.email || '').toLowerCase().trim();
  const userId = user.userId;

  const isCoordinator = event.coordinators?.some((c: any) => {
    const cEmail = (c.email || '').toLowerCase().trim();
    const cId = c.userID || c.userId || '';
    return (
      (userEmail && cEmail && cEmail === userEmail) ||
      (userId && cId && cId === userId)
    );
  });

  return Boolean(isCoordinator);
}

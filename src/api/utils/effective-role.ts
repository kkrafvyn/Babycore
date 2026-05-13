import { supabase } from './supabase.js';

export const USER_ROLE_VALUES = ['admin', 'manager', 'doctor', 'caregiver', 'viewer', 'user'] as const;

export type UserRole = (typeof USER_ROLE_VALUES)[number];
export type CareProfileType = 'baby' | 'doctor' | 'caregiver';
export type EffectiveRoleSource =
  | 'main_admin_email'
  | 'explicit_role'
  | 'app_metadata'
  | 'doctor_assignment'
  | 'family_invite'
  | 'profile_type'
  | 'default';

type AuthUserLike = {
  id?: string;
  email?: string | null;
  phone?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  app_metadata?: Record<string, any> | null;
  user_metadata?: Record<string, any> | null;
  identities?: Array<{ identity_data?: Record<string, any> | null }> | null;
};

type ExplicitRoleRecord = {
  role: UserRole;
  assignedAt: string | null;
  assignedBy: string | null;
};

type DerivedRoleSignal = {
  role: UserRole;
  assignedAt: string | null;
  assignedBy: string | null;
};

type RoleSignals = {
  email: string;
  appMetadataRole: UserRole | null;
  profileType: CareProfileType | null;
  explicitRole: ExplicitRoleRecord | null;
  doctorRole: DerivedRoleSignal | null;
  inviteRole: DerivedRoleSignal | null;
};

export interface EffectiveRoleResolution {
  role: UserRole;
  source: EffectiveRoleSource;
  assignedAt: string | null;
  assignedBy: string | null;
}

export interface EffectiveAuthUserRecord extends EffectiveRoleResolution {
  id: string;
  email: string;
  phone?: string | null;
  name: string;
  profileType: CareProfileType | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  babiesCount: number;
}

const MAIN_ADMIN_EMAILS = new Set(['ponk3020@gmail.com']);
const USER_ROLE_SET = new Set<UserRole>(USER_ROLE_VALUES);
const CARE_ROLE_STRENGTH: Record<'viewer' | 'caregiver' | 'doctor', number> = {
  viewer: 1,
  caregiver: 2,
  doctor: 3,
};
const AUTH_USERS_PER_PAGE = 1000;
const MAX_AUTH_USER_PAGES = 25;

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const normalizeEmail = (value?: string | null): string => normalizeString(value).toLowerCase();

export const normalizeUserRole = (value: unknown): UserRole | null => {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized || !USER_ROLE_SET.has(normalized as UserRole)) {
    return null;
  }

  return normalized as UserRole;
};

export const normalizeProfileType = (value: unknown): CareProfileType | null => {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === 'baby' || normalized === 'doctor' || normalized === 'caregiver') {
    return normalized;
  }

  return null;
};

const normalizeAppMetadataRole = (user: AuthUserLike): UserRole | null =>
  normalizeUserRole(user?.app_metadata?.role);

const mapInviteRoleToUserRole = (value: unknown): UserRole | null => {
  const normalized = normalizeString(value).toLowerCase();

  switch (normalized) {
    case 'doctor':
      return 'doctor';
    case 'caregiver':
    case 'editor':
      return 'caregiver';
    case 'viewer':
      return 'viewer';
    default:
      return null;
  }
};

const isMainAdminEmail = (email: string): boolean => MAIN_ADMIN_EMAILS.has(email);

const pickStrongerCareRole = (
  current: DerivedRoleSignal | null,
  next: DerivedRoleSignal,
): DerivedRoleSignal => {
  const currentStrength =
    current && (current.role === 'viewer' || current.role === 'caregiver' || current.role === 'doctor')
      ? CARE_ROLE_STRENGTH[current.role]
      : 0;
  const nextStrength =
    next.role === 'viewer' || next.role === 'caregiver' || next.role === 'doctor'
      ? CARE_ROLE_STRENGTH[next.role]
      : 0;

  if (nextStrength > currentStrength) {
    return next;
  }

  if (nextStrength === currentStrength && next.assignedAt && (!current?.assignedAt || next.assignedAt > current.assignedAt)) {
    return next;
  }

  return current || next;
};

const resolveEffectiveRoleFromSignals = (signals: RoleSignals): EffectiveRoleResolution => {
  if (isMainAdminEmail(signals.email)) {
    return {
      role: 'admin',
      source: 'main_admin_email',
      assignedAt: signals.explicitRole?.assignedAt || null,
      assignedBy: signals.explicitRole?.assignedBy || null,
    };
  }

  if (signals.explicitRole && signals.explicitRole.role !== 'user') {
    return {
      role: signals.explicitRole.role,
      source: 'explicit_role',
      assignedAt: signals.explicitRole.assignedAt,
      assignedBy: signals.explicitRole.assignedBy,
    };
  }

  if (signals.appMetadataRole && signals.appMetadataRole !== 'user') {
    return {
      role: signals.appMetadataRole,
      source: 'app_metadata',
      assignedAt: null,
      assignedBy: null,
    };
  }

  if (signals.doctorRole) {
    return {
      role: signals.doctorRole.role,
      source: 'doctor_assignment',
      assignedAt: signals.doctorRole.assignedAt,
      assignedBy: signals.doctorRole.assignedBy,
    };
  }

  if (signals.inviteRole) {
    return {
      role: signals.inviteRole.role,
      source: 'family_invite',
      assignedAt: signals.inviteRole.assignedAt,
      assignedBy: signals.inviteRole.assignedBy,
    };
  }

  if (signals.profileType === 'doctor' || signals.profileType === 'caregiver') {
    return {
      role: signals.profileType,
      source: 'profile_type',
      assignedAt: null,
      assignedBy: null,
    };
  }

  if (signals.explicitRole?.role === 'user') {
    return {
      role: 'user',
      source: 'explicit_role',
      assignedAt: signals.explicitRole.assignedAt,
      assignedBy: signals.explicitRole.assignedBy,
    };
  }

  if (signals.appMetadataRole === 'user') {
    return {
      role: 'user',
      source: 'app_metadata',
      assignedAt: null,
      assignedBy: null,
    };
  }

  return {
    role: 'user',
    source: 'default',
    assignedAt: null,
    assignedBy: null,
  };
};

export const resolveFallbackRoleFromUser = (user: AuthUserLike): UserRole =>
  resolveEffectiveRoleFromSignals({
    email: normalizeEmail(user?.email),
    appMetadataRole: normalizeAppMetadataRole(user),
    profileType: normalizeProfileType(user?.user_metadata?.onboarding_profile_type),
    explicitRole: null,
    doctorRole: null,
    inviteRole: null,
  }).role;

const addBabyAccess = (target: Map<string, Set<string>>, userId: string, babyId: string) => {
  if (!userId || !babyId) return;
  const existing = target.get(userId) || new Set<string>();
  existing.add(babyId);
  target.set(userId, existing);
};

const mergeBabyAccessMaps = (maps: Array<Map<string, Set<string>>>): Map<string, number> => {
  const merged = new Map<string, Set<string>>();

  for (const source of maps) {
    source.forEach((babyIds, userId) => {
      const existing = merged.get(userId) || new Set<string>();
      babyIds.forEach((babyId) => existing.add(babyId));
      merged.set(userId, existing);
    });
  }

  const counts = new Map<string, number>();
  merged.forEach((babyIds, userId) => counts.set(userId, babyIds.size));
  return counts;
};

const fetchExplicitRoles = async (userIds: string[]): Promise<Map<string, ExplicitRoleRecord>> => {
  const roles = new Map<string, ExplicitRoleRecord>();
  if (userIds.length === 0) return roles;

  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id, role, assigned_at, assigned_by')
    .in('user_id', userIds);

  if (error) {
    throw error;
  }

  for (const row of data || []) {
    const userId = normalizeString((row as any).user_id);
    const role = normalizeUserRole((row as any).role);
    if (!userId || !role) continue;

    roles.set(userId, {
      role,
      assignedAt: normalizeString((row as any).assigned_at) || null,
      assignedBy: normalizeString((row as any).assigned_by) || null,
    });
  }

  return roles;
};

const fetchInviteSignals = async (
  authUsers: AuthUserLike[],
): Promise<{
  inviteRoles: Map<string, DerivedRoleSignal>;
  inviteBabyAccess: Map<string, Set<string>>;
}> => {
  const inviteRoles = new Map<string, DerivedRoleSignal>();
  const inviteBabyAccess = new Map<string, Set<string>>();
  const userIds = authUsers.map((user) => normalizeString(user.id)).filter(Boolean);
  const emailToUserIds = new Map<string, string[]>();

  for (const user of authUsers) {
    const userId = normalizeString(user.id);
    const email = normalizeEmail(user.email);
    if (!userId || !email) continue;
    const existing = emailToUserIds.get(email) || [];
    existing.push(userId);
    emailToUserIds.set(email, existing);
  }

  const queries: Array<any> = [];

  if (userIds.length > 0) {
    queries.push(
      supabase
        .from('family_sharing_invites')
        .select('accepted_by, invited_email, baby_id, role, accepted_at, created_by')
        .not('accepted_at', 'is', null)
        .in('accepted_by', userIds),
    );
  }

  const emails = Array.from(emailToUserIds.keys());
  if (emails.length > 0) {
    queries.push(
      supabase
        .from('family_sharing_invites')
        .select('accepted_by, invited_email, baby_id, role, accepted_at, created_by')
        .not('accepted_at', 'is', null)
        .in('invited_email', emails),
    );
  }

  if (queries.length === 0) {
    return { inviteRoles, inviteBabyAccess };
  }

  const results = await Promise.all(queries);
  for (const result of results) {
    if (result.error) {
      throw result.error;
    }

    for (const row of result.data || []) {
      const mappedRole = mapInviteRoleToUserRole((row as any).role);
      if (!mappedRole) continue;

      const acceptedBy = normalizeString((row as any).accepted_by);
      const invitedEmail = normalizeEmail((row as any).invited_email);
      const babyId = normalizeString((row as any).baby_id);
      const assignedAt = normalizeString((row as any).accepted_at) || null;
      const assignedBy = normalizeString((row as any).created_by) || null;
      const targetUserIds = new Set<string>();

      if (acceptedBy) {
        targetUserIds.add(acceptedBy);
      }

      for (const matchedUserId of emailToUserIds.get(invitedEmail) || []) {
        targetUserIds.add(matchedUserId);
      }

      for (const userId of targetUserIds) {
        const nextSignal = pickStrongerCareRole(inviteRoles.get(userId) || null, {
          role: mappedRole,
          assignedAt,
          assignedBy,
        });

        inviteRoles.set(userId, nextSignal);
        addBabyAccess(inviteBabyAccess, userId, babyId);
      }
    }
  }

  return { inviteRoles, inviteBabyAccess };
};

const fetchDoctorSignals = async (
  userIds: string[],
): Promise<{
  doctorRoles: Map<string, DerivedRoleSignal>;
  doctorBabyAccess: Map<string, Set<string>>;
}> => {
  const doctorRoles = new Map<string, DerivedRoleSignal>();
  const doctorBabyAccess = new Map<string, Set<string>>();
  if (userIds.length === 0) {
    return { doctorRoles, doctorBabyAccess };
  }

  const { data, error } = await supabase
    .from('doctor_baby_assignments')
    .select('doctor_id, parent_id, baby_id, created_at, start_date, status')
    .in('doctor_id', userIds)
    .or('status.eq.active,status.is.null');

  if (error) {
    throw error;
  }

  for (const row of data || []) {
    const doctorId = normalizeString((row as any).doctor_id);
    const babyId = normalizeString((row as any).baby_id);
    if (!doctorId || !babyId) continue;

    doctorRoles.set(doctorId, {
      role: 'doctor',
      assignedAt:
        normalizeString((row as any).start_date) ||
        normalizeString((row as any).created_at) ||
        null,
      assignedBy: normalizeString((row as any).parent_id) || null,
    });
    addBabyAccess(doctorBabyAccess, doctorId, babyId);
  }

  return { doctorRoles, doctorBabyAccess };
};

const fetchOwnedBabyAccess = async (userIds: string[]): Promise<Map<string, Set<string>>> => {
  const ownedBabyAccess = new Map<string, Set<string>>();
  if (userIds.length === 0) return ownedBabyAccess;

  const { data, error } = await supabase
    .from('babies')
    .select('id, user_id')
    .in('user_id', userIds);

  if (error) {
    throw error;
  }

  for (const row of data || []) {
    addBabyAccess(
      ownedBabyAccess,
      normalizeString((row as any).user_id),
      normalizeString((row as any).id),
    );
  }

  return ownedBabyAccess;
};

const resolveDisplayName = (user: AuthUserLike): string => {
  const userMetadata = user?.user_metadata || {};
  const identityData = user?.identities?.[0]?.identity_data || {};
  const candidates = [
    normalizeString(userMetadata.name),
    normalizeString(userMetadata.full_name),
    normalizeString(userMetadata.doctor_name),
    normalizeString(userMetadata.caregiver_name),
    normalizeString(identityData.full_name),
    normalizeString(identityData.name),
  ].filter(Boolean);

  if (candidates.length > 0) {
    return candidates[0];
  }

  const email = normalizeEmail(user?.email);
  return email ? email.split('@')[0] : 'Unknown user';
};

export async function resolveEffectiveRoleForUser(user: AuthUserLike): Promise<UserRole> {
  const userId = normalizeString(user.id);
  if (!userId) {
    return resolveFallbackRoleFromUser(user);
  }

  const explicitRoles = await fetchExplicitRoles([userId]);
  const [{ inviteRoles }, { doctorRoles }] = await Promise.all([
    fetchInviteSignals([user]),
    fetchDoctorSignals([userId]),
  ]);

  return resolveEffectiveRoleFromSignals({
    email: normalizeEmail(user.email),
    appMetadataRole: normalizeAppMetadataRole(user),
    profileType: normalizeProfileType(user?.user_metadata?.onboarding_profile_type),
    explicitRole: explicitRoles.get(userId) || null,
    doctorRole: doctorRoles.get(userId) || null,
    inviteRole: inviteRoles.get(userId) || null,
  }).role;
}

export async function listAllAuthUsers(): Promise<AuthUserLike[]> {
  const authAdmin = (supabase.auth as any).admin;
  const users: AuthUserLike[] = [];

  for (let page = 1; page <= MAX_AUTH_USER_PAGES; page += 1) {
    const { data, error } = await authAdmin.listUsers({
      page,
      perPage: AUTH_USERS_PER_PAGE,
    });

    if (error) {
      throw error;
    }

    const pageUsers = Array.isArray(data?.users) ? data.users : [];
    users.push(...pageUsers);

    if (pageUsers.length < AUTH_USERS_PER_PAGE) {
      break;
    }
  }

  return users;
}

export async function enrichAuthUsersWithEffectiveRoles(
  authUsers: AuthUserLike[],
): Promise<EffectiveAuthUserRecord[]> {
  if (authUsers.length === 0) {
    return [];
  }

  const userIds = authUsers.map((user) => normalizeString(user.id)).filter(Boolean);
  const [explicitRoles, inviteData, doctorData, ownedBabyAccess] = await Promise.all([
    fetchExplicitRoles(userIds),
    fetchInviteSignals(authUsers),
    fetchDoctorSignals(userIds),
    fetchOwnedBabyAccess(userIds),
  ]);

  const babiesCountByUserId = mergeBabyAccessMaps([
    ownedBabyAccess,
    inviteData.inviteBabyAccess,
    doctorData.doctorBabyAccess,
  ]);

  return authUsers.map((user) => {
    const userId = normalizeString(user.id);
    const profileType =
      normalizeProfileType(user?.user_metadata?.onboarding_profile_type) ||
      null;
    const resolution = resolveEffectiveRoleFromSignals({
      email: normalizeEmail(user.email),
      appMetadataRole: normalizeAppMetadataRole(user),
      profileType,
      explicitRole: explicitRoles.get(userId) || null,
      doctorRole: doctorData.doctorRoles.get(userId) || null,
      inviteRole: inviteData.inviteRoles.get(userId) || null,
    });

    const effectiveProfileType =
      profileType ||
      (resolution.role === 'doctor' || resolution.role === 'caregiver' ? resolution.role : null);

    return {
      id: userId,
      email: normalizeString(user.email),
      phone: normalizeString(user.phone) || null,
      name: resolveDisplayName(user),
      role: resolution.role,
      source: resolution.source,
      assignedAt: resolution.assignedAt,
      assignedBy: resolution.assignedBy,
      profileType: effectiveProfileType,
      createdAt: normalizeString(user.created_at) || null,
      lastSignInAt: normalizeString(user.last_sign_in_at) || null,
      babiesCount: babiesCountByUserId.get(userId) || 0,
    };
  });
}

export async function getEffectiveRoleForUserId(userId: string): Promise<UserRole> {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) return 'user';

  const authAdmin = (supabase.auth as any).admin;
  const { data, error } = await authAdmin.getUserById(normalizedUserId);

  if (error || !data?.user) {
    return 'user';
  }

  return resolveEffectiveRoleForUser(data.user);
}

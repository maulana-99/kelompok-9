import "server-only";

import { ApiError } from "@/lib/errors";
import {
  CredentialsValidationError,
  validateCredentials,
} from "@/server/auth/credentials.policy";
import {
  deleteExpiredSessions,
  deleteSessionByToken,
  findLiveSession,
  generateSessionToken,
  insertSession,
} from "@/server/auth/sessions.repository";
import {
  UserAlreadyExistsError,
  findUserById,
  findUserByUsername,
  insertUser,
} from "@/server/auth/users.repository";
import { hashPassword, verifyPassword } from "@/server/security/password";

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type PublicUser = {
  id: number;
  username: string;
};

export type IssuedSession = {
  user: PublicUser;
  token: string;
  expiresAt: number;
};

// A real hash verified when the username is unknown, so timing does not reveal
// whether an account exists.
const DUMMY_HASH = hashPassword("dummy-password-never-matches-any-input-4f2a9c");

function toApiError(error: unknown): ApiError {
  if (error instanceof CredentialsValidationError) {
    return ApiError.validation(error.fieldErrors);
  }
  if (error instanceof UserAlreadyExistsError) return ApiError.usernameTaken();
  if (error instanceof ApiError) return error;
  return new ApiError("INTERNAL_ERROR", "Something went wrong.", 500);
}

function toPublicUser(record: { id: number; username: string }): PublicUser {
  return { id: record.id, username: record.username };
}

async function issueSession(user: PublicUser): Promise<IssuedSession> {
  await deleteExpiredSessions();

  const token = generateSessionToken();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await insertSession(token, user.id, expiresAt);

  return { user, token, expiresAt };
}

export async function registerUser(raw: {
  username: unknown;
  password: unknown;
}): Promise<IssuedSession> {
  try {
    const { username, password } = validateCredentials("register", raw);
    const { id } = await insertUser({
      username,
      passwordHash: hashPassword(password),
    });

    return await issueSession({ id, username });
  } catch (error) {
    throw toApiError(error);
  }
}

export async function loginUser(raw: {
  username: unknown;
  password: unknown;
}): Promise<IssuedSession> {
  try {
    const { username, password } = validateCredentials("login", raw);

    const record = await findUserByUsername(username);
    const passwordMatches = verifyPassword(
      password,
      record?.passwordHash ?? DUMMY_HASH,
    );

    if (!record || !passwordMatches) throw ApiError.invalidCredentials();

    return await issueSession(toPublicUser(record));
  } catch (error) {
    throw toApiError(error);
  }
}

export async function logoutUser(token: string | undefined): Promise<void> {
  if (token) await deleteSessionByToken(token);
}

export async function resolveSession(
  token: string | undefined,
): Promise<PublicUser | null> {
  if (!token) return null;

  const session = await findLiveSession(token);
  if (!session) return null;

  const record = await findUserById(session.userId);
  return record ? toPublicUser(record) : null;
}

export async function requireUser(
  token: string | undefined,
): Promise<PublicUser> {
  const user = await resolveSession(token);
  if (!user) throw ApiError.unauthorized();
  return user;
}

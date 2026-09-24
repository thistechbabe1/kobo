import { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, unsealAuthToken, AuthSessionPayload } from './session';

/**
 * Verifies the kobo_auth HTTP-only cookie on incoming API requests using jose
 * Returns the verified AuthSessionPayload or null if missing/invalid/expired
 */
export async function verifyAuthSession(request: NextRequest): Promise<AuthSessionPayload | null> {
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
  if (!authCookie || !authCookie.value) {
    return null;
  }
  return await unsealAuthToken(authCookie.value);
}

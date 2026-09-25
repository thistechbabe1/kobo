import { describe, it, expect, beforeEach } from 'vitest';
import { sealAuthToken, unsealAuthToken } from '../../src/lib/session';

const TEST_SECRET = 'dGhpcy1pcy1hLXRlc3Qtc2VjcmV0LWtleS1mb3ItZGV2ZWxvcG1lbnQtb25seTMyYnl0ZXM=';

describe('kobo_auth JWE Cookie Security (lib/session & proxy)', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = TEST_SECRET;
  });

  it('1. NO COOKIE: returns null when token is undefined or empty string', async () => {
    const resNull = await unsealAuthToken(undefined);
    expect(resNull).toBeNull();

    const resEmpty = await unsealAuthToken('');
    expect(resEmpty).toBeNull();
  });

  it('2. TAMPERED COOKIE: returns null when payload or signature is corrupted', async () => {
    const validToken = await sealAuthToken({
      sub: 'usr_babatunde_001',
      email: 'babatunde@kobo.demo',
      name: 'Babatunde Adebayo',
    });

    // Modify middle characters of JWE string to simulate tampering
    const tamperedToken = validToken.slice(0, 10) + 'X9Z' + validToken.slice(13);

    const resTampered = await unsealAuthToken(tamperedToken);
    expect(resTampered).toBeNull();
  });

  it('3. EXPIRED COOKIE: returns null when JWT token is expired', async () => {
    // Seal token with negative expiration time (-1s)
    const expiredToken = await sealAuthToken(
      {
        sub: 'usr_babatunde_001',
        email: 'babatunde@kobo.demo',
        name: 'Babatunde Adebayo',
      },
      '-1s'
    );

    const resExpired = await unsealAuthToken(expiredToken);
    expect(resExpired).toBeNull();
  });

  it('4. VALID COOKIE: decrypts valid claims correctly', async () => {
    const validToken = await sealAuthToken({
      sub: 'usr_babatunde_001',
      email: 'babatunde@kobo.demo',
      name: 'Babatunde Adebayo',
    });

    const session = await unsealAuthToken(validToken);
    expect(session).not.toBeNull();
    expect(session?.sub).toBe('usr_babatunde_001');
    expect(session?.email).toBe('babatunde@kobo.demo');
    expect(session?.name).toBe('Babatunde Adebayo');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy, AUTH_COOKIE_NAME } from '../../src/proxy';
import { sealAuthToken } from '../../src/lib/session';

const TEST_SECRET = 'dGhpcy1pcy1hLXRlc3Qtc2VjcmV0LWtleS1mb3ItZGV2ZWxvcG1lbnQtb25seTMyYnl0ZXM=';

describe('Next.js 16 Proxy Route Protection (src/proxy.ts)', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = TEST_SECRET;
  });

  it('1. PUBLIC ROUTES: /, /login, /api/auth/login pass through without auth cookie', async () => {
    const reqLanding = new NextRequest('http://localhost:3000/');
    const resLanding = await proxy(reqLanding);
    expect(resLanding.status).toBe(200);

    const reqLogin = new NextRequest('http://localhost:3000/login');
    const resLogin = await proxy(reqLogin);
    expect(resLogin.status).toBe(200);

    const reqAuthApi = new NextRequest('http://localhost:3000/api/auth/login');
    const resAuthApi = await proxy(reqAuthApi);
    expect(resAuthApi.status).toBe(200);
  });

  it('2. PROTECTED API ROUTES: /api/* without cookie returns JSON 401 (not redirect HTML)', async () => {
    const reqApi = new NextRequest('http://localhost:3000/api/wallet/transfer');
    const resApi = await proxy(reqApi);

    expect(resApi.status).toBe(401);
    const body = await resApi.json();
    expect(body.error).toBe('Unauthorized');
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('3. PROTECTED PAGES: /dashboard without cookie returns 307/302 redirect to /login', async () => {
    const reqDashboard = new NextRequest('http://localhost:3000/dashboard');
    const resDashboard = await proxy(reqDashboard);

    expect(resDashboard.status).toBe(307);
    const location = resDashboard.headers.get('location');
    expect(location).toContain('/login?redirectTo=%2Fdashboard');
  });

  it('4. VALID SESSION: /dashboard with valid JWE token allows access', async () => {
    const validToken = await sealAuthToken({
      sub: 'usr_babatunde_001',
      email: 'babatunde@kobo.demo',
      name: 'Babatunde Adebayo',
    });

    const reqAuth = new NextRequest('http://localhost:3000/dashboard', {
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${validToken}`,
      },
    });

    const resAuth = await proxy(reqAuth);
    expect(resAuth.status).toBe(200);
  });
});

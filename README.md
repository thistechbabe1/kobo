# Kobo - Digital Wallet & Payments Dashboard

> **Disclaimer**: Kobo is a mock digital wallet portfolio demo for Nigerian financial technology. All balances, account numbers, and transaction data are simulated. No real money or banking credentials are used.

---

## 🛠️ Tech Stack & Design Tokens

- **Framework**: Next.js 16 (App Router) in TypeScript strict mode (`noImplicitAny`).
- **Styling**: Tailwind CSS v3.4 with custom design tokens.
- **Typography**: Outfit (headings) & Inter (body/numerals) via `next/font/google`.
- **Security & State**: `jose` sealed JWE HTTP-only cookies (`kobo_auth` and `kobo_state`).
- **Charts**: Recharts (loaded via `next/dynamic` with `ssr: false`).
- **Forms**: React Hook Form + Zod.
- **Testing & CI**: Vitest unit test suite + GitHub Actions CI workflow.

### Tailwind CSS Version Rationale
> **Empirically Verified Rationale**: During setup in this Windows Next.js 16 Webpack environment, Tailwind v4 (`@tailwindcss/postcss`) failed to compile due to native Rust binding initialization issues (`@tailwindcss/oxide`). Switching to Tailwind CSS v3.4 (`tailwindcss: ^3.4.17` + `postcss: ^8.4.49`) resolves all compilation issues and builds cleanly locally (`npm run build`) and in GitHub Actions CI.

---

## 🔒 Security & Route Protection (`src/proxy.ts`)

- **Sealed JWE Authentication Token (`kobo_auth`)**: Encrypted using `jose` (`EncryptJWT` with `A256GCM`) using `SESSION_SECRET`.
- **Proxy Route Guard**: `src/proxy.ts` verifies `kobo_auth` on all requests:
  - **Protected Page Routes** (`/dashboard`, `/transactions`, `/send`): Unauthenticated requests are redirected (302) to `/login?redirectTo=...`.
  - **Protected API Routes** (`/api/*`): Unauthenticated requests return JSON `{ error: 'Unauthorized', code: 'UNAUTHORIZED' }` with status `401`.
  - **Public Routes** (`/`, `/login`, `/api/auth/login`): Always accessible.

---

## 🎨 WCAG 2.1 Color Contrast Audit Table

Every text/background pair meets W3C relative luminance contrast requirements:

| Element / Pair | Foreground | Background | Calculated Ratio | WCAG Rating | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Light Body (Graphite)** | `#1A2421` | `#FDFBF7` | **15.41:1** | **AAA** | ✅ PASS |
| **Light Muted Text** | `#4A5551` | `#FDFBF7` | **7.50:1** | **AAA** | ✅ PASS |
| **Light Semantic Credit Text** | `#0D7855` | `#FDFBF7` | **5.30:1** | **AA** | ✅ PASS |
| **Light Semantic Debit Text** | `#C2410C` | `#FDFBF7` | **5.01:1** | **AA** | ✅ PASS |
| **Light Graphic Icon (Terracotta)** | `#E05638` | `#FDFBF7` | **3.66:1** | **AA Large** | ✅ PASS |
| **Light Body on Card** | `#1A2421` | `#FFFFFF` | **15.93:1** | **AAA** | ✅ PASS |
| **Light Muted on Card** | `#4A5551` | `#FFFFFF` | **7.75:1** | **AA** | ✅ PASS |
| **Light Credit Text on Card** | `#0D7855` | `#FFFFFF` | **5.48:1** | **AA** | ✅ PASS |
| **Light Debit Text on Card** | `#C2410C` | `#FFFFFF` | **5.18:1** | **AA** | ✅ PASS |
| **White Text on Primary Green** | `#FFFFFF` | `#0D7855` | **5.48:1** | **AA** | ✅ PASS |
| **White Text on Deep Terracotta** | `#FFFFFF` | `#C2410C` | **5.18:1** | **AA** | ✅ PASS |
| **Dark Body (Off-White)** | `#F4F6F5` | `#0A1411` | **17.26:1** | **AAA** | ✅ PASS |
| **Dark Muted Text** | `#94A8A0` | `#0A1411` | **7.46:1** | **AAA** | ✅ PASS |
| **Dark Credit Text** | `#14A877` | `#0A1411` | **6.15:1** | **AA** | ✅ PASS |
| **Dark Debit Text (#FF6B4A)** | `#FF6B4A` | `#0A1411` | **6.65:1** | **AA** | ✅ PASS |
| **Dark Body on Dark Card** | `#F4F6F5` | `#14241F` | **14.86:1** | **AAA** | ✅ PASS |
| **Dark Muted on Dark Card** | `#94A8A0` | `#14241F` | **6.43:1** | **AA** | ✅ PASS |
| **Dark Credit Text on Dark Card** | `#14A877` | `#14241F` | **5.30:1** | **AA** | ✅ PASS |
| **Dark Debit Text (#FF6B4A) on Card** | `#FF6B4A` | `#14241F` | **5.73:1** | **AA** | ✅ PASS |
| **Dark Text on Mint Button** | `#0A1411` | `#14A877` | **6.15:1** | **AA** | ✅ PASS |

---

## 📅 Remaining Work Schedule (Target: Friday 9 October 2026)

- **Mon 21 Sept - Thu 24 Sept**: Feature 2 Dashboard Overview, Recharts analytics, financial reconciliation & JWE cookie security. *(Completed)*
- **Fri 25 Sept - Mon 28 Sept**: Feature 3 Transaction History Page (Search bar, category filter, date filtering, pagination).
- **Tue 29 Sept - Sat 3 Oct**: Feature 4 Send Money Flow (Account resolution mock, transaction PIN modal, rate limiter 5 payments/60s).
- **Sun 4 Oct - Tue 6 Oct**: Feature 5 Marketing Landing Page (`/`) with product-first headline, animated dashboard preview, and small "Built with" tech strip.
- **Wed 7 Oct - Fri 9 Oct**: Final Polish & Verification (Playwright E2E send money test, Vercel deployment, final documentation).
- **Sat 10 Oct+**: Application Buffer Days.

---

## 🚀 Deployment Guide (Vercel)

1. **Connect Repository**: Import `thistechbabe1/kobo` in the Vercel Dashboard.
2. **Environment Variables**:
   - `SESSION_SECRET`: Generate a 32-byte secret key locally via:
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
     and paste into Vercel environment variables.
3. **Deploy**: Click **Deploy**. Vercel will run `npm run build` and publish the live URL.

# Kobo - Digital Wallet & Payments Dashboard

> **Disclaimer**: Kobo is a mock digital wallet portfolio demo for Nigerian financial technology. All balances, account numbers, and transaction data are simulated. No real money or banking credentials are used.

A digital wallet simulation for Nigerian payments, featuring 10-digit NUBAN transfers, instant account resolution, illustrative fee tiers, and PIN-authorized transfers.

[Live Demo](https://kobo-theta-nine.vercel.app/)

<img width="1280" height="750" alt="landing-dark" src="https://github.com/user-attachments/assets/6f4fa341-e9b7-4948-a3c1-59f9645cdff2" />

## Features

- **NUBAN Name Resolution**: Instant inquiry across 12 commercial and digital banks.
- **5-Step Transfer Flow**: Recipient resolution, fee calculation, transfer review, PIN entry, and downloadable receipts.
- **Fee Calculation**: Tiered transfer fee schedule modeled on Nigerian banking guidance.
- **Security & Lockout**: 4-digit PIN verification with automated 15-minute lockout after 3 failed attempts.
- **Transaction Analytics**: Real-time spending charts, category filtering, and transaction search.
- **Accessible & Responsive**: Fully responsive UI with dark mode support and keyboard navigation.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS
- **Security**: AES-256-GCM sealed cookies (`jose`)
- **Charts & Motion**: Recharts, Motion
- **Testing**: Vitest, Playwright

## Getting Started

```bash
# Clone the repository
git clone https://github.com/thistechbabe1/kobo.git
cd kobo

# Install dependencies
npm install

# Start local dev server
npm run dev

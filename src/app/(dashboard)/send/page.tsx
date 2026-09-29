import { cookies } from 'next/headers';
import { COOKIE_NAME, unsealSessionState } from '@/lib/session';
import { SendMoneyFlow } from '@/components/send/SendMoneyFlow';

export const metadata = {
  title: 'Send Money | Kobo',
  description: 'Fast, secure bank transfers and peer-to-peer payments across Nigeria.',
};

export default async function SendPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  const session = await unsealSessionState(sessionCookie?.value);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-[var(--text-primary)]">Send Money</h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Instant, secure transfers to any Nigerian commercial bank or licensed fintech.
        </p>
      </div>

      <SendMoneyFlow initialState={session} />
    </div>
  );
}

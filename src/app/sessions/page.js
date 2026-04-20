import AppShell from '@/components/AppShell';
import { getSessions } from '@/app/actions';
import SessionManager from './SessionManager';

export const metadata = {
  title: 'Sessions | MyPomo',
};

export default async function SessionsPage() {
  const sessions = await getSessions();

  return (
    <AppShell>
      <SessionManager sessions={sessions} />
    </AppShell>
  );
}

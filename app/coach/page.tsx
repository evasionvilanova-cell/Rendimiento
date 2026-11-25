import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { hasCoach } from '@/lib/coach';
import CoachChat from '@/components/CoachChat';
import TabBar from '@/components/TabBar';

export default async function Coach() {
  await requireAuth();
  return (
    <main className="phone">
      <div className="header">
        <div className="stack-sm" style={{ gap: 4 }}>
          <Link href="/" style={{ fontSize: 13, textDecoration: 'none' }}>← Hoy</Link>
          <h1>Entrenador IA</h1>
        </div>
      </div>
      <CoachChat enabled={hasCoach()} />
      <TabBar active="/coach" />
    </main>
  );
}

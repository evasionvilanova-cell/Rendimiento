import Link from 'next/link';

const TABS = [
  { href: '/', label: 'Hoy' },
  { href: '/semana', label: 'Semana' },
  { href: '/tendencias', label: 'Tendencias' },
  { href: '/informe', label: 'Informe' },
  { href: '/coach', label: 'Coach IA' },
];

export default function TabBar({ active }: { active: string }) {
  return (
    <nav className="tabbar" aria-label="Secciones">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={t.href === active ? 'on' : undefined} aria-current={t.href === active ? 'page' : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

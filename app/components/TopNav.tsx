import Link from 'next/link';

export function TopNav() {
  return (
    <nav className="mb-4 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 shadow-lg shadow-black/20">
      <Link href="/" className="text-lg font-semibold text-white transition hover:text-cyan-300">
        Study Agent
      </Link>
      <div className="flex gap-2">
        <Link
          href="/"
          className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-500 hover:text-cyan-300"
        >
          Chat
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-500"
        >
          Dashboard
        </Link>
      </div>
    </nav>
  );
}

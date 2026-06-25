import { createClient } from '@supabase/supabase-js';
import { TopNav } from '../components/TopNav';
import { ConceptDashboard } from './ConceptDashboard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function getConcepts() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.from('concepts').select('*').order('last_updated', { ascending: false });

  if (error) {
    console.error('Failed to load concepts', error);
    return [];
  }

  return data ?? [];
}

export default async function DashboardPage() {
  const concepts = await getConcepts();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <TopNav />
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-inner shadow-black/10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Dashboard</p>
              <h1 className="mt-1 text-2xl font-semibold text-white">Your learning progress</h1>
            </div>
          </div>
          <ConceptDashboard concepts={concepts} />
        </section>
      </main>
    </div>
  );
}

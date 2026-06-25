'use client';

import { useState } from 'react';

type ConceptRow = {
  subject?: string | null;
  concept?: string | null;
  mastery_level?: string | null;
  overview_gist?: string | null;
  strong_areas?: string[] | string | null;
  weak_areas?: string[] | string | null;
  next_steps?: string[] | string | null;
  last_updated?: string | null;
};

type ConceptDashboardProps = {
  concepts: ConceptRow[];
};

const subjectStyles: Record<string, string> = {
  physics: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  biology: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  mathematics: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  'computer science': 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  chemistry: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

const masteryStyles: Record<string, string> = {
  strong: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  proficient: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  developing: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  introduced: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  'in progress': 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
};

function normalizeList(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => String(item).trim());
  }

  if (typeof value === 'string') {
    return value
      .split(/,|\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function scoreForMastery(value?: string | null): number {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('strong')) return 4;
  if (normalized.includes('proficient')) return 3;
  if (normalized.includes('developing')) return 2;
  if (normalized.includes('introduced')) return 1;
  if (normalized.includes('progress')) return 0;
  return 0;
}

function formatDate(value?: string | null) {
  if (!value) return 'Not yet updated';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not yet updated';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ConceptDashboard({ concepts }: ConceptDashboardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const scores = concepts.map((concept) => scoreForMastery(concept.mastery_level));
  const averageScore = concepts.length
    ? (scores.reduce((sum, score) => sum + Number(score), 0) / concepts.length / 4) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
          <p className="text-sm text-slate-400">Total concepts studied</p>
          <p className="mt-2 text-3xl font-semibold text-white">{concepts.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
          <p className="text-sm text-slate-400">Unique subjects</p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {new Set(concepts.map((concept) => concept.subject?.toLowerCase()).filter(Boolean)).size}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
          <p className="text-sm text-slate-400">Average mastery</p>
          <p className="mt-2 text-3xl font-semibold text-white">{averageScore.toFixed(0)}%</p>
        </div>
      </div>

      <div className="grid gap-4">
        {concepts.map((concept, index) => {
          const subject = (concept.subject || 'General').trim();
          const mastery = (concept.mastery_level || 'In Progress').trim();
          const score = scoreForMastery(mastery);
          const progressPercent = Math.round((score / 4) * 100);
          const isExpanded = expandedId === `${subject}-${concept.concept}-${index}`;
          const styleKey = subject.toLowerCase();
          const subjectClass = subjectStyles[styleKey] || 'bg-slate-500/15 text-slate-300 border-slate-500/30';
          const masteryClass = masteryStyles[mastery.toLowerCase()] || masteryStyles['in progress'];

          return (
            <button
              key={`${subject}-${concept.concept}-${index}`}
              type="button"
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left shadow-lg shadow-black/20 transition hover:border-cyan-500/40"
              onClick={() =>
                setExpandedId((current) => (current === `${subject}-${concept.concept}-${index}` ? null : `${subject}-${concept.concept}-${index}`))
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${subjectClass}`}>
                    {subject}
                  </span>
                  <h2 className="text-lg font-semibold text-white">{concept.concept || 'Untitled concept'}</h2>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${masteryClass}`}>
                  {mastery || 'In Progress'}
                </span>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
                  <span>Mastery progress</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div className="h-2 rounded-full bg-cyan-500" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
                <span>{concept.overview_gist || 'No overview saved yet.'}</span>
                <span>Updated {formatDate(concept.last_updated)}</span>
              </div>

              {isExpanded && (
                <div className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-emerald-300">Strong areas</p>
                    <div className="flex flex-wrap gap-2">
                      {normalizeList(concept.strong_areas).length ? (
                        normalizeList(concept.strong_areas).map((item) => (
                          <span key={item} className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">
                            {item}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">No strong areas recorded.</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-rose-300">Weak areas</p>
                    <div className="flex flex-wrap gap-2">
                      {normalizeList(concept.weak_areas).length ? (
                        normalizeList(concept.weak_areas).map((item) => (
                          <span key={item} className="rounded-full bg-rose-500/15 px-3 py-1 text-xs text-rose-300">
                            {item}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">No weak areas recorded.</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-cyan-300">Next steps</p>
                    <div className="flex flex-wrap gap-2">
                      {normalizeList(concept.next_steps).length ? (
                        normalizeList(concept.next_steps).map((item) => (
                          <span key={item} className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs text-cyan-300">
                            {item}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">No next steps recorded.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

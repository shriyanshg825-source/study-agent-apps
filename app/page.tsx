'use client';

import { useState } from 'react';
import { TopNav } from './components/TopNav';

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  subject?: string;
  concept?: string;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
};

function parseSavePayload(text: string, subject: string, concept: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const firstParagraph = normalized.split(/(?<=[.!?])\s+/)[0] ?? normalized;
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const lower = normalized.toLowerCase();
  let masteryLevel = 'Developing';
  if (lower.includes('strong') || lower.includes('proficient')) {
    masteryLevel = 'Proficient';
  } else if (lower.includes('beginner') || lower.includes('intro')) {
    masteryLevel = 'Introduced';
  }

  const extractSection = (labels: string[]) => {
    const sectionRegex = new RegExp(`(${labels.join('|')})\\s*[:\-]\\s*(.+)`, 'i');
    const match = normalized.match(sectionRegex);
    if (match?.[2]) {
      return [match[2].trim()];
    }
    return [];
  };

  return {
    subject,
    concept,
    masteryLevel,
    overviewGist: firstParagraph.slice(0, 280),
    deepDiveGist: paragraphs.slice(1, 4),
    strongAreas: extractSection(['strong areas', 'strengths', 'what you already know']),
    weakAreas: extractSection(['weak areas', 'common pitfalls', 'what to watch']),
    nextSteps: extractSection(['next steps', 'practice', 'try next']),
    notes: normalized,
  };
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const detectResponse = await fetch('/api/detect-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: trimmed }),
      });

      const detected = await detectResponse.json();
      const subject = typeof detected?.subject === 'string' ? detected.subject : '';
      const concept = typeof detected?.concept === 'string' ? detected.concept : '';

      const assistantId = Date.now() + 1;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          subject,
          concept,
        },
      ]);

      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: trimmed, subject, concept }),
      });

      if (!chatResponse.ok || !chatResponse.body) {
        throw new Error('The chat response could not be streamed.');
      }

      const reader = chatResponse.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        streamedText += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId ? { ...message, content: streamedText } : message,
          ),
        );
      }

      streamedText += decoder.decode();
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId ? { ...message, content: streamedText } : message,
        ),
      );
    } catch (error) {
      console.error(error);
      const assistantId = Date.now() + 2;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: 'Sorry, I could not generate a response right now.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProgress = async (message: Message) => {
    if (!message.subject || !message.concept) {
      return;
    }

    setMessages((prev) =>
      prev.map((item) =>
        item.id === message.id ? { ...item, saveState: 'saving' } : item,
      ),
    );

    try {
      const payload = parseSavePayload(message.content, message.subject, message.concept);
      const saveResponse = await fetch('/api/save-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!saveResponse.ok) {
        throw new Error('Save failed');
      }

      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id ? { ...item, saveState: 'saved' } : item,
        ),
      );
    } catch (error) {
      console.error(error);
      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id ? { ...item, saveState: 'error' } : item,
        ),
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <TopNav />
        <header className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 shadow-lg shadow-black/20">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Study Companion</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Ask anything you want to learn</h1>
          <p className="mt-2 text-sm text-slate-400">The assistant adapts to the topic and keeps track of your progress.</p>
        </header>

        <section className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-inner shadow-black/10">
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-sm text-slate-400">
              Start by asking a study question such as “Explain recursion like I’m a beginner.”
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-cyan-700 text-white' : 'border border-slate-700 bg-slate-800/90 text-slate-200'}`}>
                  <div className="whitespace-pre-wrap text-sm leading-7">{message.content || (message.role === 'assistant' ? 'Thinking…' : '')}</div>
                  {message.role === 'assistant' && message.subject && message.concept && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => handleSaveProgress(message)}
                        disabled={message.saveState === 'saving'}
                        className="rounded-full border border-cyan-600/40 bg-cyan-600/10 px-3 py-1 text-xs font-medium text-cyan-300 transition hover:bg-cyan-600/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {message.saveState === 'saving'
                          ? 'Saving…'
                          : message.saveState === 'saved'
                            ? 'Saved'
                            : message.saveState === 'error'
                              ? 'Try again'
                              : 'Save progress'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </section>

        <form
          className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-lg shadow-black/20 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            handleSend();
          }}
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask a study question..."
            rows={2}
            className="min-h-[56px] flex-1 resize-none rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {isLoading ? 'Thinking...' : 'Send'}
          </button>
        </form>
      </main>
    </div>
  );
}

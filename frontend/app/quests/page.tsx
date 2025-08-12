'use client';
import { useEffect, useState } from 'react';
import FooterNav from '../components/FooterNav';

type Quest = { id: string; title: string; subtitle?: string; progress?: number };

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const api = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    const url = `${api}/api/quests`;
    fetch(url)
      .then(r => r.json())
      .then(setQuests)
      .catch(e => setError(String(e)));
  }, [api]);

  return (
    <>
      <main className="main">
        {!quests && !error && <div className="loading">Loading tasks...</div>}
        {error && <p style={{color: 'crimson'}}>Error: {error}</p>}
        {quests && (
          <div style={{display: 'grid', gap: 12}}>
            {quests.map(q => (
              <article key={q.id} style={{border: '1px solid #e5e7eb', borderRadius: 12, padding: 12}}>
                <h3 style={{margin: '4px 0'}}>{q.title}</h3>
                {q.subtitle && <p style={{margin: 0, color: '#707579'}}>{q.subtitle}</p>}
                {typeof q.progress === 'number' && (
                  <div style={{marginTop: 8}}>
                    <div style={{height: 8, background: '#f4f4f5', borderRadius: 999}}>
                      <div style={{width: `${q.progress}%`, height: 8, borderRadius: 999, background: '#3390ec'}}/>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
      <FooterNav />
    </>
  );
}

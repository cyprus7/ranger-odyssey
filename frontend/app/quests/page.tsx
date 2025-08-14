'use client';
import { useEffect, useState } from 'react';
import FooterNav from '../components/FooterNav';
import logger from '../utils/logger';

type Quest = { id: string; title: string; subtitle?: string; progress?: number };
type QuestState = {
  currentScene: {
    id: string;
    title: string;
    description: string;
    image?: string;
  };
  choices: {
    id: string;
    text: string;
  }[];
};

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[] | null>(null);
  const [questState, setQuestState] = useState<QuestState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    logger.info('Fetching quest list...');
    fetch(`${api}/api/quests`)
      .then(r => r.json())
      .then(data => {
        logger.info({ quests: data }, 'Quest list fetched');
        setQuests(data);
      })
      .catch(e => {
        logger.error({ error: e }, 'Failed to fetch quest list');
        setError(String(e));
      });

    logger.info('Fetching current quest state...');
    fetch(`${api}/api/quests/state`)
      .then(r => r.json())
      .then(data => {
        logger.info({ questState: data }, 'Quest state fetched');
        setQuestState(data);
      })
      .catch(e => {
        logger.error({ error: e }, 'Failed to fetch quest state');
        setError(String(e));
      })
      .finally(() => setLoading(false));
  }, [api]);

  const handleChoice = (choiceId: string) => {
    logger.info({ choiceId }, 'Submitting quest choice...');
    setLoading(true);
    fetch(`${api}/api/quests/choice`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ choiceId })
    })
      .then(r => r.json())
      .then(data => {
        logger.info({ result: data }, 'Quest choice submitted');
        setQuestState(prev => prev ? {
          ...prev,
          currentScene: data.newScene,
          choices: [] // Clear choices after selection
        } : null);
        setTimeout(() => {
          logger.info('Refreshing quest state...');
          fetch(`${api}/api/quests/state`)
            .then(r => r.json())
            .then(data => {
              logger.info({ questState: data }, 'Quest state refreshed');
              setQuestState(data);
            })
            .catch(e => {
              logger.error({ error: e }, 'Failed to refresh quest state');
              setError(String(e));
            });
        }, 2000);
      })
      .catch(e => {
        logger.error({ error: e }, 'Failed to submit quest choice');
        setError(String(e));
      })
      .finally(() => setLoading(false));
  };

  return (
    <>
      <main className="main">
        {loading && <div className="loading">Loading quest data...</div>}
        {error && <p style={{color: 'crimson'}}>Error: {error}</p>}
        
        {questState && !loading && (
          <div className="quest-scene" style={{marginBottom: 24}}>
            <h2>{questState.currentScene.title}</h2>
            {questState.currentScene.image && (
              <img 
                src={questState.currentScene.image} 
                alt={questState.currentScene.title} 
                style={{width: '100%', borderRadius: 8, marginBottom: 16}}
              />
            )}
            <p>{questState.currentScene.description}</p>
            
            {questState.choices.length > 0 && (
              <div className="choices" style={{display: 'grid', gap: 8}}>
                {questState.choices.map(choice => (
                  <button 
                    key={choice.id}
                    onClick={() => handleChoice(choice.id)}
                    style={{
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {choice.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        {quests && !loading && (
          <div style={{display: 'grid', gap: 12}}>
            <h3>Your Quests</h3>
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

function formatTimeRemaining(endTimeISOString: string): string {
  const endTime = new Date(endTimeISOString).getTime();
  const now = Date.now();
  const diff = Math.max(0, endTime - now);
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

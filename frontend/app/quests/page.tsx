'use client'
import { useEffect, useState } from 'react'
import FooterNav from '../components/FooterNav'
import logger from '../utils/logger'
import { ensureTelegramAuth, fetchJson } from '../utils/auth'

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

// добавлен тип профиля и состояние inventory
type InventoryItem = { id: string; qty: number }
type Profile = {
  tags?: Record<string, number>
  main_type?: string
  main_psychotype?: string
  confidence?: number
  inventory?: InventoryItem[]
  stats?: Record<string, number>
}

export default function QuestsPage() {
    const [, setQuests] = useState<Quest[] | null>(null)
    const [questState, setQuestState] = useState<QuestState | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    // новое состояние для инвентаря
    const [inventory, setInventory] = useState<InventoryItem[]>([])
    const api = process.env.NEXT_PUBLIC_API_URL || ''

    useEffect(() => {
        (async () => {
            try {
                logger.info('Auth & initial fetch...')
                await ensureTelegramAuth(api)
                const [q, s, profile] = await Promise.all([
                    fetchJson<Quest[]>(`${api}/api/quests`, undefined, api),
                    fetchJson<QuestState>(`${api}/api/quests/state`, undefined, api),
                    fetchJson<Profile>(`${api}/api/profile`, undefined, api),
                ])
                setQuests(q)
                setQuestState(s)
                // сохраняем инвентарь (если есть)
                setInventory(profile?.inventory ?? [])
            } catch (e) {
                logger.error({ e }, 'Init failed')
                setError(e instanceof Error ? e.message : String(e))
            } finally {
                setLoading(false)
            }
        })()
    }, [api])

    const handleChoice = async (choiceId: string) => {
        logger.info({ choiceId }, 'Submitting quest choice...')
        setLoading(true)
        try {
            const data = await fetchJson<QuestState>(
                `${api}/api/quests/choice`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ choiceId }),
                },
                api
            )
            logger.info({ result: data }, 'Quest choice submitted')
            setQuestState(data)
        } catch (e) {
            logger.error({ e }, 'Failed to submit quest choice')
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <main className="main">
                {loading && <div className="loading">Loading quest data...</div>}
                {error && <p style={{color: 'crimson'}}>Error: {error}</p>}

                {/* показываем инвентарь — простой список id и qty */}
                {inventory.length > 0 && !loading && (
                    <div style={{ marginBottom: 18, background: '#fff', padding: 12, borderRadius: 8 }}>
                        <h3 style={{ margin: '0 0 8px 0' }}>Inventory</h3>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {inventory.map(item => (
                                <li key={item.id} style={{ marginBottom: 6 }}>
                                    <strong>{item.id}</strong>: {item.qty}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
        
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
            </main>
            <FooterNav />
        </>
    )
}
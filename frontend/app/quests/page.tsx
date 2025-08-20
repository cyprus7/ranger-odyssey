'use client'
import { useEffect, useState } from 'react'
import FooterNav from '../components/FooterNav'
import logger from '../utils/logger'
import { ensureTelegramAuth, fetchJson, postJson } from '../utils/auth'

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
    const [showNameModal, setShowNameModal] = useState(false)
    const [playerNameInput, setPlayerNameInput] = useState('')
    const [waitingNameSave, setWaitingNameSave] = useState(false)
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
                const playerName = await ensureTelegramAuth(api)
                if (playerName === null) {
                    // запрашиваем у пользователя имя
                    setShowNameModal(true)
                }
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

    const savePlayerName = async () => {
        if (!playerNameInput || playerNameInput.trim().length === 0) return
        try {
            setWaitingNameSave(true)
            await postJson(`${api}/api/profile`, { player_name: playerNameInput.trim() }, api)
            setShowNameModal(false)
            // refresh profile/inventory
            const profile = await fetchJson<Profile>(`${api}/api/profile`, undefined, api)
            setInventory(profile?.inventory ?? [])
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setWaitingNameSave(false)
        }
    }

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
        
                {/* Simple modal to set player name if missing */}
                {showNameModal && (
                    <div style={{
                        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.5)', zIndex: 1200,
                    }}>
                        <div style={{ background: '#fff', padding: 18, borderRadius: 12, width: '92%', maxWidth: 420 }}>
                            <h3 style={{ marginTop: 0 }}>Choose your player name</h3>
                            <p style={{ marginTop: 0, color: '#666' }}>Enter a short name that will be shown to others.</p>
                            <input
                                value={playerNameInput}
                                onChange={e => setPlayerNameInput(e.target.value)}
                                placeholder="Your name"
                                style={{ width: '100%', padding: 8, fontSize: 16, borderRadius: 8, border: '1px solid #ddd', marginBottom: 12 }}
                            />
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button onClick={() => setShowNameModal(false)} style={{ padding: '8px 12px', borderRadius: 8 }}>Cancel</button>
                                <button
                                    onClick={savePlayerName}
                                    disabled={waitingNameSave}
                                    style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none' }}
                                >
                                    {waitingNameSave ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
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

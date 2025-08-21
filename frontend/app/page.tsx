'use client'
import { useEffect, useState } from 'react'
import FooterNav from './components/FooterNav'
import { useRouter } from 'next/navigation'
import { ensureTelegramAuth, fetchJson, putJson } from './utils/auth'
import NamePicker from './components/NamePicker'

type Quest = {
  id: string;
  title: string;
  subtitle?: string;
  progress?: number;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
}

export default function HomePage() {
    const [quests, setQuests] = useState<Quest[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [showNameModal, setShowNameModal] = useState(false)
    const [pendingFetchAfterName, setPendingFetchAfterName] = useState(false)
    const [playerNameInitial, setPlayerNameInitial] = useState<string | null>(null)
    const api = process.env.NEXT_PUBLIC_API_URL || ''
    const router = useRouter()

    useEffect(() => {
        (async () => {
            try {
                setLoading(true)
                // ensure auth and ask for player name if server indicates missing name
                const playerName = await ensureTelegramAuth(api)
                if (playerName === null) {
                    // prefill from Telegram first_name if available
                    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined

                    // Safely extract initDataUnsafe without using `any`
                    const initDataUnsafe = tg?.initDataUnsafe as unknown
                    let firstName = ''
                    if (initDataUnsafe && typeof initDataUnsafe === 'object') {
                        const typed = initDataUnsafe as { user?: { first_name?: string } }
                        if (typed.user && typeof typed.user.first_name === 'string') {
                            firstName = typed.user.first_name
                        }
                    }

                    setPlayerNameInitial(String(firstName).trim() || null)
                    setShowNameModal(true)
                    setPendingFetchAfterName(true)
                    return
                }
                const data = await fetchJson<Quest[]>(`${api}/api/quests`, undefined, api)
                setQuests(data)
            } catch (e: unknown) {
                setError(String((e as Error)?.message || e))
            } finally {
                setLoading(false)
            }
        })()
    }, [api])

    const handleQuestClick = (id: string, status: Quest['status']) => {
        // only allow navigation for available quests
        if (status !== 'available' && status !== 'in_progress') return
        router.push(`/quests?id=${id}`)
    }

    const savePlayerName = async (name: string) => {
        try {
            setLoading(true)
            await putJson(`${api}/api/profile`, { player_name: name }, api)
            setShowNameModal(false)
            if (pendingFetchAfterName) {
                // continue loading quests now that name is set
                try {
                    const data = await fetchJson<Quest[]>(`${api}/api/quests`, undefined, api)
                    setQuests(data)
                    setPendingFetchAfterName(false)
                } catch (e: unknown) {
                    setError(String((e as Error)?.message || e))
                }
            }
        } catch (e: unknown) {
            setError(String((e as Error)?.message || e))
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <main className="main">
                <h1>Available Quests</h1>
                {!quests && !error && (loading || !quests) && <div className="loading">Loading quests...</div>}
                {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}
                {quests && (
                    <div style={{ display: 'grid', gap: 12 }}>
                        {quests.map(quest => {
                            const isClickable = quest.status === 'available'
                            const statusColor = quest.status === 'available'
                                ? '#10b981' // green
                                : quest.status === 'in_progress'
                                    ? '#f59e0b' // amber
                                    : quest.status === 'completed'
                                        ? '#6366f1' // indigo
                                        : '#94a3b8' // muted for locked
                            return (
                                <article
                                    key={quest.id}
                                    style={{
                                        border: '1px solid #e5e7eb',
                                        borderRadius: 12,
                                        padding: 12,
                                        cursor: isClickable ? 'pointer' : 'default',
                                        opacity: isClickable ? 1 : 0.85,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                    onClick={() => handleQuestClick(quest.id, quest.status)}
                                >
                                    <div>
                                        <h3 style={{ margin: '4px 0' }}>{quest.title}</h3>
                                        {quest.subtitle && <p style={{ margin: 0, color: '#707579' }}>{quest.subtitle}</p>}
                                    </div>
                                    <div style={{ marginLeft: 12, textAlign: 'right' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '6px 10px',
                                            borderRadius: 999,
                                            background: '#fff',
                                            border: `1px solid ${statusColor}`,
                                            color: statusColor,
                                            fontWeight: 700,
                                            fontSize: 12,
                                        }}>
                                            {quest.status}
                                        </span>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </main>
            <FooterNav />
            {/* Name picker modal shown on first auth if server returned player_name === null */}
            {showNameModal && (
                <div style={{
                    position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.5)', zIndex: 1200,
                }}>
                    <NamePicker
                        onConfirm={savePlayerName}
                        onCancel={() => setShowNameModal(false)}
                        maxLength={12}
                        initial={playerNameInitial}
                    />
                </div>
            )}
        </>
    )
}

'use client'
import { useEffect, useState } from 'react'
import FooterNav from './components/FooterNav'
import { useRouter } from 'next/navigation'
import { ensureTelegramAuth, fetchJson } from './utils/auth'

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
    const api = process.env.NEXT_PUBLIC_API_URL || ''
    const router = useRouter()

    useEffect(() => {
        (async () => {
            try {
                await ensureTelegramAuth(api) // cookie c JWT на 15 мин
                const data = await fetchJson<Quest[]>(`${api}/api/quests`, undefined, api)
                setQuests(data)
            } catch (e: unknown) {
                setError(String((e as Error)?.message || e))
            }
        })()
    }, [api])
 
    const handleQuestClick = (id: string, status: Quest['status']) => {
        // only allow navigation for available quests
        if (status !== 'available' && status !== 'in_progress') return
        router.push(`/quests?id=${id}`)
    }
 
    return (
        <>
            <main className="main">
                <h1>Available Quests</h1>
                {!quests && !error && <div className="loading">Loading quests...</div>}
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
        </>
    )
}

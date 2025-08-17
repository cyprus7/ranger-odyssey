'use client'
import { useEffect, useState } from 'react'
import FooterNav from './components/FooterNav'
import { useRouter } from 'next/navigation'
import { ensureTelegramAuth, fetchJson } from './utils/auth'

type Quest = { id: string; title: string; subtitle?: string; progress?: number }

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

    const handleQuestClick = (id: string) => {
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
                        {quests.map(quest => (
                            <article
                                key={quest.id}
                                style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 12,
                                    padding: 12,
                                    cursor: 'pointer',
                                }}
                                onClick={() => handleQuestClick(quest.id)}
                            >
                                <h3 style={{ margin: '4px 0' }}>{quest.title}</h3>
                                {quest.subtitle && <p style={{ margin: 0, color: '#707579' }}>{quest.subtitle}</p>}
                            </article>
                        ))}
                    </div>
                )}
            </main>
            <FooterNav />
        </>
    )
}

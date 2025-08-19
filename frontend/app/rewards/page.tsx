'use client'
import { useEffect, useState } from 'react'
import FooterNav from '../components/FooterNav'
import { ensureTelegramAuth, fetchJson, postJson } from '../utils/auth'

type Reward = {
  day: number;
  bonus_code?: string | null;
  status: 'accrued' | 'issuing' | 'claimed';
};

type Profile = {
  rewards?: Reward[];
}

export default function RewardsPage() {
    const [rewards, setRewards] = useState<Reward[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const api = process.env.NEXT_PUBLIC_API_URL || ''

    useEffect(() => {
        (async () => {
            try {
                setLoading(true)
                await ensureTelegramAuth(api)
                // теперь список наград приходит в /api/profile.rewards
                const profile = await fetchJson<Profile>(`${api}/api/profile`, undefined, api)
                setRewards(profile.rewards ?? [])
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : String(e))
            } finally {
                setLoading(false)
            }
        })()
    }, [api])

    const handleClaim = async (day: number) => {
        try {
            setLoading(true)
            await postJson(`${api}/api/rewards/${day}/claim`, undefined, api)
            // Оптимистично обновляем статус локально
            setRewards(prev => prev?.map(r => r.day === day ? { ...r, status: 'claimed' } : r) ?? null)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <main className="main">
                <h1>Your Rewards</h1>

                {!rewards && !error && loading && <div className="loading">Loading rewards...</div>}
                {error && <p style={{color: 'crimson'}}>Error: {error}</p>}

                {rewards && (
                    <div style={{display: 'grid', gap: 12}}>
                        {rewards.map(reward => {
                            const claimed = reward.status === 'claimed'
                            const locked = reward.status !== 'accrued'
                            return (
                                <article 
                                    key={reward.day} 
                                    style={{
                                        border: '1px solid #e5e7eb', 
                                        borderRadius: 12, 
                                        padding: 12,
                                        opacity: locked ? 0.7 : 1
                                    }}
                                >
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                        <div>
                                            <h3 style={{margin: '4px 0'}}>Day {reward.day} Bonus</h3>
                                            <p style={{margin: 0, fontFamily: 'monospace', fontSize: '1.1em'}}>{reward.bonus_code ?? '—'}</p>
                                        </div>
                                        <div>
                                            {claimed ? (
                                                <span style={{color: 'green', fontWeight: 'bold'}}>✓ Claimed</span>
                                            ) : reward.status === 'issuing' ? (
                                                <span style={{color: '#f59e0b', fontWeight: '600'}}>Issuing…</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleClaim(reward.day)}
                                                    disabled={loading || locked === false ? false : true}
                                                    style={{
                                                        background: 'var(--primary)',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        cursor: loading ? 'default' : 'pointer'
                                                    }}
                                                >
                                                Claim
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            )})}
                    </div>
                )}
            </main>
            <FooterNav />
        </>
    )
}

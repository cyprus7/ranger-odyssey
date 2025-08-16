'use client'
import { useEffect, useState } from 'react'
import FooterNav from '../components/FooterNav'

type Reward = {
  day: number;
  bonus_code: string;
  claimed: boolean;
  locked?: boolean;
};

export default function RewardsPage() {
    const [rewards, setRewards] = useState<Reward[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const api = process.env.NEXT_PUBLIC_API_URL || ''

    useEffect(() => {
        const url = `${api}/api/rewards`
        fetch(url)
            .then(r => r.json())
            .then(setRewards)
            .catch(e => setError(String(e)))
    }, [api])

    return (
        <>
            <main className="main">
                <h1>Your Rewards</h1>
        
                {!rewards && !error && <div className="loading">Loading rewards...</div>}
                {error && <p style={{color: 'crimson'}}>Error: {error}</p>}
        
                {rewards && (
                    <div style={{display: 'grid', gap: 12}}>
                        {rewards.map(reward => (
                            <article 
                                key={reward.day} 
                                style={{
                                    border: '1px solid #e5e7eb', 
                                    borderRadius: 12, 
                                    padding: 12,
                                    opacity: reward.locked ? 0.6 : 1
                                }}
                            >
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <div>
                                        <h3 style={{margin: '4px 0'}}>Day {reward.day} Bonus</h3>
                                        <p style={{margin: 0, fontFamily: 'monospace', fontSize: '1.1em'}}>{reward.bonus_code}</p>
                                    </div>
                                    <div>
                                        {reward.claimed ? (
                                            <span style={{color: 'green', fontWeight: 'bold'}}>✓ Claimed</span>
                                        ) : reward.locked ? (
                                            <span style={{color: '#888'}}>🔒 Locked</span>
                                        ) : (
                                            <button style={{
                                                background: 'var(--primary)',
                                                color: 'white',
                                                border: 'none',
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                cursor: 'pointer'
                                            }}>
                        Claim
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </main>
            <FooterNav />
        </>
    )
}

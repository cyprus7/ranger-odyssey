import React, { useMemo, useState, useEffect, KeyboardEvent } from 'react'

type Props = {
    maxLength?: number
    onConfirm: (name: string) => void
    onCancel?: () => void
    initial?: string | null
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export default function NamePicker({ maxLength = 12, onConfirm, onCancel, initial = null }: Props) {
    const [name, setName] = useState((initial ?? '').toUpperCase().slice(0, maxLength))
    const tiles = useMemo(() => {
        // mix alphabet with some repeated letters for variety
        const pool = ALPHABET.split('').concat(Array.from(ALPHABET).slice(0, 8))
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[pool[i], pool[j]] = [pool[j], pool[i]]
        }
        return pool.slice(0, Math.min(24, pool.length))
    }, [])

    useEffect(() => {
        const handler = (ev: KeyboardEvent) => {
            const key = ev.key
            if (!key) return
            if (key === 'Backspace') {
                setName(n => n.slice(0, -1))
            } else if (/^[a-zA-Z]$/.test(key)) {
                setName(n => (n + key.toUpperCase()).slice(0, maxLength))
            } else if (key === 'Enter') {
                onConfirm(name)
            } else if (key === 'Escape') {
                onCancel?.()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [name, maxLength, onConfirm, onCancel])

    return (
        <div style={{
            width: '100%', maxWidth: 520, background: '#fff', padding: 16, borderRadius: 12,
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
        }}>
            <h3 style={{ marginTop: 0 }}>Choose your player name</h3>
            <p style={{ marginTop: 0, color: '#666' }}>Click tiles or type to build a short name (max {maxLength}).</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{
                    minHeight: 44, padding: '8px 12px', borderRadius: 10, border: '1px solid #e5e7eb',
                    background: '#f9fafb', fontFamily: 'monospace', fontSize: 18, flex: 1
                }}>
                    {name || <span style={{ color: '#9aa4b2' }}>your-name</span>}
                </div>
                <button onClick={() => setName('')} title="Clear" style={{ padding: '8px 12px', borderRadius: 8 }}>Clear</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10, marginBottom: 12 }}>
                {tiles.map((ch, idx) => {
                    const rot = (idx * 13) % 7 - 3
                    const hue = (idx * 37) % 360
                    return (
                        <button
                            key={idx}
                            onClick={() => setName(n => (n + ch).slice(0, maxLength))}
                            style={{
                                height: 48,
                                borderRadius: 8,
                                border: 'none',
                                background: `linear-gradient(180deg,hsl(${hue} 70% 60%), hsl(${hue} 60% 50%))`,
                                color: '#fff',
                                fontWeight: 700,
                                transform: `rotate(${rot}deg) translateY(${(idx % 3) - 1}px)`,
                                boxShadow: '0 6px 16px rgba(2,6,23,0.12)',
                                cursor: 'pointer',
                                fontSize: 16,
                            }}
                        >
                            {ch}
                        </button>
                    )
                })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setName(n => n.slice(0, -1))} style={{ padding: '8px 12px', borderRadius: 8 }}>Backspace</button>
                    <button onClick={() => setName('')} style={{ padding: '8px 12px', borderRadius: 8 }}>Reset</button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => onCancel?.()} style={{ padding: '8px 12px', borderRadius: 8 }}>Cancel</button>
                    <button
                        onClick={() => onConfirm(name)}
                        disabled={name.trim().length === 0}
                        style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none' }}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    )
}

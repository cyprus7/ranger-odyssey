'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
    { href: '/', label: 'Home', icon: HomeIcon },
    { href: '/ai', label: 'AI', icon: AiIcon },
    { href: '/quests', label: 'Quests', icon: QuestsIcon },
    { href: '/rewards', label: 'Rewards', icon: RewardsIcon },
    { href: '/wallet', label: 'Wallet', icon: WalletIcon },
]

export default function FooterNav() {
    const pathname = usePathname()
    return (
        <footer className="footer">
            <nav className="footer-nav">
                {items.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || (href !== '/' && pathname.startsWith(href))
                    return (
                        <Link key={href} href={href} className={`footer-btn ${active ? 'active' : ''}`}>
                            <Icon />
                            <span>{label}</span>
                        </Link>
                    )
                })}
            </nav>
        </footer>
    )
}

function HomeIcon() {
    return (<svg width="24" height="24" fill="none"><path fill="#fff" d="M13.633 3.026c-1.19-1.032-3.078-1.034-4.262-.01L3.48 8.103c-.458.394-.792.961-.994 1.53-.202.57-.299 1.223-.203 1.824l1.131 7.296c.255 1.625 1.69 2.991 3.325 2.991h9.519c1.626 0 3.07-1.376 3.324-2.99l1.13-7.3c.09-.6-.008-1.252-.21-1.82-.2-.569-.53-1.135-.983-1.528L13.633 3.026z"/></svg>)
}
function AiIcon() {
    return (<svg width="25" height="24" fill="none"><path stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.241 14.002c-4.49-2.4-4.49-3.6-4.49-4s0-1.6 4.49-4m0 8c-4.49 2.4-4.491 3.2-4.491 4m4.491-4c4.49-2.4 4.49-3.6 4.49-4s0-1.6-4.49-4m0 0c4.49-2.4 4.49-3.2 4.49-4m-4.49 4L6.058 4.746C3.75 3.283 3.75 2.643 3.75 2.002M15.162 12v1.979m-3.487 1.521h2.052m5.97 0h2.053m-2.052 2.974h2.052m-10.075 0h2.052m1.435 1.545V22m3.025-1.98V22m-.01-10v1.979m-3.45 5.988h3.97a1 1 0 0 0 1-1V14.98a1 1 0 0 0-1-1h-3.97a1 1 0 0 0-1 1v3.988a1 1 0 0 0 1 1"/></svg>)
}
function QuestsIcon() {
    return (<svg width="25" height="24" fill="none"><g stroke="#fff" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.763 10.163c-.501.349-1.109-.266-.755-.763a5.45 5.45 0 0 0 .163-6.07l-.091-.143c-.325-.514.273-1.113.79-.787l.165.107a5.47 5.47 0 0 0 6.061-.124c.503-.352 1.114.265.759.767a5.47 5.47 0 0 0-.19 6.06l.105.169c.321.517-.283 1.11-.794.779l-.142-.095a5.45 5.45 0 0 0-6.073.102z"/><circle cx="6.5" cy="17" r="3.25"/><circle cx="18.5" cy="17" r="3.25"/><circle cx="18.5" cy="7" r="3.25"/></g></svg>)
}
function RewardsIcon() {
    return (<svg width="25" height="24" fill="none"><path d="M28.6 29.4c3-2.3 7.4-5.7 7.4-18.4v-1H14v1c0 12.7 4.5 16.1 7.4 18.4 1.7 1.3 2.6 2 2.6 3.6v3c-1.6.2-3.2.8-3.8 2H18c-1.1 0-2 .9-2 2h18c0-1.1-.9-2-2-2h-2.2c-.6-1.2-2.1-1.8-3.8-2v-3c0-1.6.8-2.3 2.6-3.6zm-3.6.5c-.6-.8-1.5-1.5-2.3-2.1-2.7-2.1-6.4-4.9-6.6-15.8h18c-.2 10.8-3.9 13.7-6.6 15.8-1 .7-1.9 1.3-2.5 2.1z" /><path d="M18.8 27C18.7 27 8 24.7 8 13v-1h7v2h-5c.6 9.2 9.1 11 9.2 11l-.4 2z" /><path d="M31.2 27l-.4-2c.4-.1 8.6-1.9 9.2-11h-5v-2h7v1c0 11.7-10.7 14-10.8 14z" /></svg>)
}
function WalletIcon() {
    return (<svg width="24" height="24" fill="none"><path stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0-2 2m0 0a2 2 0 0 0 2 2h15a1 1 0 0 1 1 1v4M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4m0-4h-3a2 2 0 0 0 0 4h3m0-4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1"/></svg>)
}

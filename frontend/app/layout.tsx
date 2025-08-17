import './globals.css'
import React from 'react'
import Script from 'next/script'

export const metadata = {
    title: process.env.NEXT_PUBLIC_APP_TITLE || 'Quests',
    viewport: 'width=device-width, initial-scale=1'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <script src="https://telegram.org/js/telegram-web-app.js" />
                <link rel="icon" href="/favicon.ico" />
                <Script id="telegram-ready" strategy="afterInteractive">
                    {'try { window.Telegram?.WebApp?.ready?.(); } catch (e) { console.error(\'Telegram WebApp ready failed\', e); }'}
                </Script>
            </head>
            <body>
                <div className="app">{children}</div>
            </body>
        </html>
    )
}

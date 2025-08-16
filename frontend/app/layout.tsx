import './globals.css'

export const metadata = {
    title: process.env.NEXT_PUBLIC_APP_TITLE || 'GeoQuests',
    viewport: 'width=device-width, initial-scale=1'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <script src="https://telegram.org/js/telegram-web-app.js" />
                <link rel="icon" href="/favicon.ico" />
            </head>
            <body>
                <div className="app">{children}</div>
            </body>
        </html>
    )
}

/** base64url -> Uint8Array */
function b64urlToBytes(b64url: string): Uint8Array {
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64url.length / 4) * 4, '=')
    const str = typeof window !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary')
    const bytes = new Uint8Array(str.length)
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i)
    return bytes
}

export function decodeStartParamBase64url<T = unknown>(sp: string): T | null {
    try {
        const bytes = b64urlToBytes(sp)
        const json = new TextDecoder().decode(bytes)
        return JSON.parse(json) as T
    } catch {
        return null
    }
}

/** Достаём start_param из Telegram WebApp или из query (?tgWebAppStartParam=) */
export function getStartParamRaw(): string | null {
    try {
        const fromTg = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initDataUnsafe?.start_param : undefined
        if (fromTg) return fromTg
        if (typeof window === 'undefined') return null
        const url = new URL(window.location.href)
        const fromQuery = url.searchParams.get('tgWebAppStartParam')
        return fromQuery || null
    } catch {
        return null
    }
}

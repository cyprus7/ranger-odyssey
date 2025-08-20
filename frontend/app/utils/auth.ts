import { getStartParamRaw } from './startParam'

let firstAuthDone = false

/**
 * Авторизация: отправляем initData + (однократно) декодированный startapp payload.
 * Бэк валидирует initData и ставит httpOnly cookie с JWT на 15 минут.
 */
export async function ensureTelegramAuth(apiBase: string): Promise<string | null> {
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined
    const initData = tg?.initData
    if (!initData) return null // Вне Telegram — пропускаем (гость)

    const body: Record<string, unknown> = { initData }

    // Только при первом заходе: пробуем передать ДЕКОДИРОВАННЫЙ payload из startapp
    if (!firstAuthDone) {
        const raw = getStartParamRaw()
        if (raw) {
            body.startParamRaw = raw
        }
    }

    const res = await fetch(`${apiBase}/api/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
    })

    if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(`Auth failed: ${res.status} ${t}`)
    }
    let playerName: string | null = null
    try {
        const parsed = await res.json()
        if (parsed && typeof parsed === 'object' && 'player_name' in (parsed as Record<string, unknown>)) {
            const val = (parsed as Record<string, unknown>)['player_name']
            if (typeof val === 'string') playerName = val
        }
    } catch {
        playerName = null
    }
    firstAuthDone = true
    return playerName
}

/**
 * fetch JSON с включёнными cookie и авто-реавторизацией при 401.
 * Третий аргумент — apiBase для ensureTelegramAuth.
 */
export async function fetchJson<T = unknown>(url: string, init?: RequestInit, apiBase?: string): Promise<T> {
    let res = await fetch(url, { credentials: 'include', ...init })
    if (res.status === 401 && apiBase) {
        await ensureTelegramAuth(apiBase) // ре-логин по initData
        res = await fetch(url, { credentials: 'include', ...init })
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json() as Promise<T>
}

/**
 * Примерно то же, что и fetchJson, но для POST-запросов.
 * Принимает url, данные и опционально apiBase.
 */
export async function postJson<T = unknown>(url: string, data?: unknown, apiBase?: string): Promise<T> {
    const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    if (res.status === 401 && apiBase) {
        await ensureTelegramAuth(apiBase) // ре-логин по initData
        return postJson(url, data, apiBase) // повторяем запрос
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json() as Promise<T>
}


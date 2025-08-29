import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from './jwt.service'
import { Context } from 'telegraf'
import { I18nService } from '../i18n/i18n.service'
import { PinoLogger } from 'nestjs-pino'
import { withOtelSpan } from '../observability/otel-helpers'

type ApiResponseData = {
  user?: { lang?: string }
  profile?: { lang?: string }
  lang?: string
  [key: string]: unknown
}

@Injectable()
export class ApiService {
  private readonly baseUrl: string

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly i18n: I18nService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext('ApiService')
    this.baseUrl = this.config.get<string>('API_URL', 'http://localhost:3001/api')
  }

  private headers(userId: string, ctx?: Context) {
    const lang = ctx ? this.i18n.decideBackendLang(ctx) : (this.config.get('DEFAULT_LANG') || 'ru')
    return {
      Authorization: `Bearer ${this.jwt.sign(userId)}`,
      'Accept-Language': lang,
    }
  }

  private async pickLang(res: Response, data: ApiResponseData): Promise<string | undefined> {
    return (
      res.headers.get('content-language') ||
      data?.user?.lang ||
      data?.profile?.lang ||
      data?.lang ||
      undefined
    )
  }

  async getQuestState(userId: string, ctx?: Context) {
    return withOtelSpan('getQuestState', async () => {
      try {
        const res = await fetch(`${this.baseUrl}/quests/state`, { headers: this.headers(userId, ctx) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        return { data, lang: await this.pickLang(res, data) }
      } catch (e) {
        this.logger.error({ e, userId }, 'Failed to get quest state')
        throw e
      }
    }, { userId })
  }

  async makeChoice(userId: string, choiceId: string, ctx?: Context) {
    return withOtelSpan('makeChoice', async () => {
      try {
        const res = await fetch(`${this.baseUrl}/quests/choice`, {
          method: 'PUT',
          headers: { ...this.headers(userId, ctx), 'Content-Type': 'application/json' },
          body: JSON.stringify({ choiceId })
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        return { data, lang: await this.pickLang(res, data) }
      } catch (e) {
        this.logger.error({ e, userId, choiceId }, 'Failed to make choice')
        throw e
      }
    }, { userId, choiceId })
  }

  // Сброс прогресса квеста
  async resetQuest(userId: string, ctx?: Context) {
    return withOtelSpan('resetQuest', async () => {
      try {
        const res = await fetch(`${this.baseUrl}/quests/reset`, {
          method: 'POST',
          headers: { ...this.headers(userId, ctx), 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        return { data, lang: await this.pickLang(res, data) }
      } catch (e) {
        this.logger.error({ e, userId }, 'Failed to reset quest')
        throw e
      }
    }, { userId })
  }

  // Установка языка пользователя
  async setLanguage(userId: string, lang: string, ctx?: Context) {
    return withOtelSpan('setLanguage', async () => {
      try {
        const res = await fetch(`${this.baseUrl}/profile`, {
          method: 'PUT',
          headers: { ...this.headers(userId, ctx), 'Content-Type': 'application/json' },
          body: JSON.stringify({ lang })
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        return { data, lang: await this.pickLang(res, data) }
      } catch (e) {
        this.logger.error({ e, userId, lang }, 'Failed to set language')
        throw e
      }
    }, { userId, lang })
  }

  // Инициализация профиля языком Телеграма (upsert, язык ставить только если пусто на бэке)
  async initProfile(userId: string, lang?: string, ctx?: Context) {
    return withOtelSpan('initProfile', async () => {
      try {
        const res = await fetch(`${this.baseUrl}/users/profile/init`, {
          method: 'POST',
          headers: { ...this.headers(userId, ctx), 'Content-Type': 'application/json' },
          body: JSON.stringify({ lang })
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        return { data, lang: await this.pickLang(res, data) }
      } catch (e) {
        this.logger.error({ e, userId, lang }, 'Failed to init profile')
        return { data: undefined, lang: undefined }
      }
    }, { userId, lang })
  }

  // Получить профиль (актуальный язык после /lang)
  async getProfile(userId: string, ctx?: Context) {
    return withOtelSpan('getProfile', async () => {
      try {
        const res = await fetch(`${this.baseUrl}/api/profile`, { headers: this.headers(userId, ctx) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        return { data, lang: await this.pickLang(res, data) }
      } catch (e) {
        this.logger.error({ e, userId }, 'Failed to get profile')
        throw e
      }
    }, { userId })
  }
}

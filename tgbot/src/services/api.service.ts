import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosResponse } from 'axios'
import { JwtService } from './jwt.service'
import { Context } from 'telegraf'
import { I18nService } from '../i18n/i18n.service'

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
  ) {
    this.baseUrl = this.config.get<string>('API_URL', 'http://localhost:3001/api')
  }

  private headers(userId: string, ctx?: Context) {
    const lang = ctx ? this.i18n.decideBackendLang(ctx) : (this.config.get('DEFAULT_LANG') || 'ru')
    return {
      Authorization: `Bearer ${this.jwt.sign(userId)}`,
      'Accept-Language': lang,
    }
  }

  private pickLang(res: AxiosResponse): string | undefined {
    const data = res.data as ApiResponseData
    return (
      res.headers['content-language'] as string ||
      data?.user?.lang ||
      data?.profile?.lang ||
      data?.lang ||
      undefined
    )
  }

  async getQuestState(userId: string, ctx?: Context) {
    const res = await axios.get(`${this.baseUrl}/quests/state`, { headers: this.headers(userId, ctx) })
    return { data: res.data, lang: this.pickLang(res) }
  }

  async makeChoice(userId: string, choiceId: string, ctx?: Context) {
    const res = await axios.put(`${this.baseUrl}/quests/choice`, { choiceId }, { headers: this.headers(userId, ctx) })
    return { data: res.data, lang: this.pickLang(res) }
  }

  // Сброс прогресса квеста
  async resetQuest(userId: string, ctx?: Context) {
    const res = await axios.post(`${this.baseUrl}/quests/reset`, {}, { headers: this.headers(userId, ctx) })
    return { data: res.data, lang: this.pickLang(res) }
  }

  // Установка языка пользователя
  async setLanguage(userId: string, lang: string, ctx?: Context) {
    const res = await axios.put(`${this.baseUrl}/profile`, { lang }, { headers: this.headers(userId, ctx) })
    return { data: res.data, lang: this.pickLang(res) }
  }

  // Инициализация профиля языком Телеграма (upsert, язык ставить только если пусто на бэке)
  async initProfile(userId: string, lang?: string, ctx?: Context) {
    try {
      const res = await axios.post(`${this.baseUrl}/users/profile/init`, { lang }, { headers: this.headers(userId, ctx) })
      return { data: res.data, lang: this.pickLang(res) }
    } catch {
      return { data: undefined, lang: undefined }
    }
  }

  // Получить профиль (актуальный язык после /lang)
  async getProfile(userId: string, ctx?: Context) {
    const res = await axios.get(`${this.baseUrl}/api/profile`, { headers: this.headers(userId, ctx) })
    return { data: res.data, lang: this.pickLang(res) }
  }
}

import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Context } from 'telegraf'
import { en } from './en'
import { ru } from './ru'
 
type Lang = 'en' | 'ru'
 
@Injectable()
export class I18nService {
  private readonly defaultLang: Lang
  constructor(private readonly config: ConfigService) {
    this.defaultLang = (this.config.get<string>('DEFAULT_LANG') as Lang) || 'ru'
  }
 
  private getDict(lang: Lang) {
    return lang === 'en' ? en : ru
  }
 
  private resolve(dict: any, path: string): any {
    return path.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), dict)
  }
 
  private interpolate(s: string, vars?: Record<string, string | number>) {
    if (!vars) return s
    return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`))
  }
 
  t(ctx: Context, path: string, vars?: Record<string, string | number>): string {
    const lang = (ctx as any)?.state?.lang as Lang || this.detectFromCtx(ctx)
    const value = this.resolve(this.getDict(lang), path) ?? this.resolve(this.getDict(this.defaultLang), path)
    if (typeof value === 'function') {
      return value(...Object.values(vars || {}))
    }
    return this.interpolate(String(value ?? path), vars)
  }
 
  detectFromCtx(ctx: Context): Lang {
    const tl = (ctx.from?.language_code || '').slice(0, 2).toLowerCase()
    if (tl === 'ru') return 'ru'
    if (tl === 'en') return 'en'
    return this.defaultLang
  }
 
  decideBackendLang(ctx: Context): Lang {
    return ((ctx as any)?.state?.lang as Lang) || this.detectFromCtx(ctx)
  }
}

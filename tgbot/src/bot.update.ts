import { Update, Start, Ctx, Action, Command } from 'nestjs-telegraf'
import { Context, Markup } from 'telegraf'
import { ApiService } from './services/api.service'
import { ConfigService } from '@nestjs/config'
import { I18nService } from './i18n/i18n.service'
import { PinoLogger } from 'nestjs-pino'
import { withOtelSpan } from './observability/otel-helpers'

@Update()
export class BotUpdate {
  constructor(
    private readonly api: ApiService,
    private readonly config: ConfigService,
    private readonly i18n: I18nService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext('BotUpdate')
  }

  @Start()
  async onStart(@Ctx() ctx: Context) {
    return withOtelSpan('onStart', async () => {
      const userId = String(ctx.from?.id)
      const tgLang = (ctx.from?.language_code || '').slice(0, 2).toLowerCase() || undefined
      try {
        const init = await this.api.initProfile(userId, tgLang, ctx)
        if (init.lang) (ctx as any).state = { ...(ctx as any).state, lang: init.lang }
      } catch {}
      const webAppUrl = this.config.get<string>('WEBAPP_URL')
      let webAppAvailable = false
      if (webAppUrl) {
        try {
          await fetch(webAppUrl, { method: 'HEAD' })
          webAppAvailable = true
        } catch {
          webAppAvailable = false
        }
      }
      if (webAppAvailable) {
        await ctx.reply(
          this.i18n.t(ctx, 'welcome.choose_mode'),
          Markup.inlineKeyboard([
            [Markup.button.webApp(this.i18n.t(ctx, 'common.open_app'), webAppUrl)],
            [Markup.button.callback(this.i18n.t(ctx, 'common.text_mode'), 'text_mode')],
          ]),
        )
      } else {
        await ctx.reply(this.i18n.t(ctx, 'welcome.webapp_unavailable'))
        await this.sendState(ctx)
      }
    }, { userId: String(ctx.from?.id) })
  }

  @Action('text_mode')
  async onTextMode(@Ctx() ctx: Context) {
    return withOtelSpan('onTextMode', async () => {
      await ctx.answerCbQuery()
      await this.sendState(ctx)
    }, { userId: String(ctx.from?.id) })
  }

  @Action(/choice:.+/)
  async onChoice(@Ctx() ctx: Context) {
    return withOtelSpan('onChoice', async () => {
      const data = (ctx.callbackQuery as any)?.data as string
      const choiceId = data.replace('choice:', '')
      await ctx.answerCbQuery()
      const userId = String(ctx.from?.id)
      const res = await this.api.makeChoice(userId, choiceId, ctx)
      if (res.lang) (ctx as any).state = { ...(ctx as any).state, lang: res.lang }
      await this.renderState(ctx, res.data, true)
    }, { userId: String(ctx.from?.id), choiceId: (ctx.callbackQuery as any)?.data?.replace('choice:', '') })
  }

  private async sendState(ctx: Context) {
    const userId = String(ctx.from?.id)
    const res = await this.api.getQuestState(userId, ctx)
    if (res.lang) (ctx as any).state = { ...(ctx as any).state, lang: res.lang }
    await this.renderState(ctx, res.data)
  }

  private async renderState(ctx: Context, state: any, edit = false) {
    const text = state?.currentScene?.description || this.i18n.t(ctx, 'common.no_data')
    const choices = state?.choices || []
    const keyboard = Markup.inlineKeyboard(
      choices.map((c: any) => [Markup.button.callback(c.text, `choice:${c.id}`)])
    )
    if (edit && typeof (ctx as any).editMessageText === 'function') {
      try {
        await (ctx as any).editMessageText(text, { reply_markup: keyboard.reply_markup })
        return
      } catch {
        // ignore edit errors
      }
    }
    await ctx.reply(text, keyboard)
  }

  // ====== /help ======
  @Command('help')
  async onHelp(@Ctx() ctx: Context) {
    return withOtelSpan('onHelp', async () => {
      const webAppUrl = this.config.get<string>('WEBAPP_URL')
      const kb = webAppUrl
        ? Markup.inlineKeyboard([
            [Markup.button.webApp(this.i18n.t(ctx, 'common.open_app'), webAppUrl)],
            [Markup.button.callback(this.i18n.t(ctx, 'common.text_mode'), 'text_mode')],
          ])
        : undefined
      await ctx.reply(this.i18n.t(ctx, 'help.text'), kb)
    }, { userId: String(ctx.from?.id) })
  }

  // ====== /reset ======
  @Command('reset')
  async onReset(@Ctx() ctx: Context) {
    return withOtelSpan('onReset', async () => {
      const userId = String(ctx.from?.id)
      try {
        const res = await this.api.resetQuest(userId, ctx)
        if (res.lang) (ctx as any).state = { ...(ctx as any).state, lang: res.lang }
        await ctx.reply(this.i18n.t(ctx, 'reset.ok'))
        await this.sendState(ctx)
      } catch {
        await ctx.reply(this.i18n.t(ctx, 'reset.fail'))
      }
    }, { userId: String(ctx.from?.id) })
  }

  // ====== /lang ======
  @Command('lang')
  async onLang(@Ctx() ctx: Context) {
    return withOtelSpan('onLang', async () => {
      const kb = Markup.inlineKeyboard([
        [Markup.button.callback('Русский', 'lang:ru'), Markup.button.callback('English', 'lang:en')],
      ])
      await ctx.reply(this.i18n.t(ctx, 'lang.choose'), kb)
    }, { userId: String(ctx.from?.id) })
  }

  @Action(/lang:.+/)
  async onLangChange(@Ctx() ctx: Context) {
    return withOtelSpan('onLangChange', async () => {
      const data = (ctx.callbackQuery as any)?.data as string
      const lang = data.replace('lang:', '')
      await ctx.answerCbQuery()
      const userId = String(ctx.from?.id)
      try {
        await this.api.setLanguage(userId, lang, ctx)
        const prof = await this.api.getProfile(userId, ctx)
        if (prof.lang) (ctx as any).state = { ...(ctx as any).state, lang: prof.lang }
        await ctx.reply(prof.lang === 'ru' ? this.i18n.t(ctx, 'lang.set_ru') : this.i18n.t(ctx, 'lang.set_en'))
        await this.sendState(ctx)
      } catch {
        await ctx.reply(this.i18n.t(ctx, 'lang.save_fail'))
      }
    }, { userId: String(ctx.from?.id), lang: (ctx.callbackQuery as any)?.data?.replace('lang:', '') })
  }

  // ====== /support ======
  @Command('support')
  async onSupport(@Ctx() ctx: Context) {
    return withOtelSpan('onSupport', async () => {
      const url = this.config.get<string>('SUPPORT_URL')
      const uname = this.config.get<string>('SUPPORT_USERNAME')
      if (url) {
        await ctx.reply(this.i18n.t(ctx, 'support.url', { url }))
      } else if (uname) {
        await ctx.reply(this.i18n.t(ctx, 'support.user', { uname }))
      } else {
        await ctx.reply(this.i18n.t(ctx, 'support.fallback'))
      }
    }, { userId: String(ctx.from?.id) })
  }
}

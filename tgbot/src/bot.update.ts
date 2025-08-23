import { Update, Start, Ctx, Action } from 'nestjs-telegraf'
import { Context, Markup } from 'telegraf'
import { ApiService } from './services/api.service'
import { ConfigService } from '@nestjs/config'

@Update()
export class BotUpdate {
  constructor(private readonly api: ApiService, private readonly config: ConfigService) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
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
        'Добро пожаловать! Выберите режим:',
        Markup.inlineKeyboard([
          [Markup.button.webApp('Открыть приложение', webAppUrl)],
          [Markup.button.callback('Текстовый режим', 'text_mode')],
        ])
      )
    } else {
      await ctx.reply('WebApp недоступен, переключаю в текстовый режим')
      await this.sendState(ctx)
    }
  }

  @Action('text_mode')
  async onTextMode(@Ctx() ctx: Context) {
    await ctx.answerCbQuery()
    await this.sendState(ctx)
  }

  @Action(/choice:.+/)
  async onChoice(@Ctx() ctx: Context) {
    const data = (ctx.callbackQuery as any)?.data as string
    const choiceId = data.replace('choice:', '')
    await ctx.answerCbQuery()
    const userId = String(ctx.from?.id)
    const state = await this.api.makeChoice(userId, choiceId)
    await this.renderState(ctx, state, true)
  }

  private async sendState(ctx: Context) {
    const userId = String(ctx.from?.id)
    const state = await this.api.getQuestState(userId)
    await this.renderState(ctx, state)
  }

  private async renderState(ctx: Context, state: any, edit = false) {
    const text = state?.currentScene?.description || 'Нет данных'
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
}

export const en = {
  common: {
    open_app: 'Open WebApp',
    text_mode: 'Text mode',
    no_data: 'No data',
  },
  welcome: {
    choose_mode: 'Welcome! Choose a mode:',
    webapp_unavailable: 'WebApp is unavailable, switching to text mode',
  },
  help: {
    text: [
      'Available commands:',
      '/help — help',
      '/reset — restart the quest',
      '/lang — choose language',
      '/support — contact support',
    ].join('\n'),
  },
  reset: {
    ok: 'Progress reset. Starting over 👇',
    fail: 'Failed to reset progress. Try again later.',
  },
  lang: {
    choose: 'Choose language:',
    set_ru: 'Language set: Russian',
    set_en: 'Language set: English',
    save_fail: 'Failed to save language. Try again later.',
  },
  support: {
    url: (u: string) => `Support: ${u}`,
    user: (u: string) => `Contact us: ${u}`,
    fallback: 'Support: contact the bot admin.',
  },
}
export type EnDict = typeof en

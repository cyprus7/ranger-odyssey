export const ru = {
  common: {
    open_app: 'Открыть приложение',
    text_mode: 'Текстовый режим',
    no_data: 'Нет данных',
  },
  welcome: {
    choose_mode: 'Добро пожаловать! Выберите режим:',
    webapp_unavailable: 'WebApp недоступен, переключаю в текстовый режим',
  },
  help: {
    text: [
      'Доступные команды:',
      '/help — справка',
      '/reset — начать квест заново',
      '/lang — выбор языка',
      '/support — связь с поддержкой',
    ].join('\n'),
  },
  reset: {
    ok: 'Прогресс сброшен. Начинаем заново 👇',
    fail: 'Не удалось сбросить прогресс. Попробуйте позже.',
  },
  lang: {
    choose: 'Выберите язык:',
    set_ru: 'Язык установлен: Русский',
    set_en: 'Language set: English',
    save_fail: 'Не удалось сохранить язык. Попробуйте позже.',
  },
  support: {
    url: (u: string) => `Поддержка: ${u}`,
    user: (u: string) => `Напишите нам: ${u}`,
    fallback: 'Поддержка: напишите администратору бота.',
  },
}
export type RuDict = typeof ru

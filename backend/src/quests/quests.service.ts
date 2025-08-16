import { Injectable } from '@nestjs/common'

@Injectable()
export class QuestsService {
    list() {
        return [
            { id: 'day1', title: 'День 1 — Пробуждение в Городе Мостбет', subtitle: 'Город шепчет. Сделай первый шаг.', progress: 0 },
            { id: 'day2', title: 'День 2 — Башня Слота', subtitle: 'Подними ставку. Прими вызов башни.', progress: 0 },
            { id: 'day3', title: 'День 3 — Марктлойс: Потеря Лика', subtitle: 'Что-то исчезнет. Но что — зависит от тебя.', progress: 0 },
            { id: 'day4', title: 'День 4 — Лабиринт Потерь', subtitle: 'То, что ускользнуло — ведёт к истине.', progress: 0 },
            { id: 'day5', title: 'День 5 — Врата Бездны', subtitle: 'Она зовёт. Ты слышишь?', progress: 0 },
            { id: 'day6', title: 'День 6 — Древо Последствий', subtitle: 'Оно знает, что ты выбрал. А ты?', progress: 0 },
            { id: 'day7', title: 'День 7 — Пустота Без Конца', subtitle: 'Конец пути — или начало выбора?', progress: 0 }
        ]
    }

    getQuestState(day: string = 'day1') {
        // День 1 — Пробуждение в Городе Мостбет
        if (day === 'day1') {
            return {
                currentScene: {
                    id: 'scene_1_intro',
                    title: 'День 1 — Пробуждение в Городе Мостбет',
                    description: '«Всё началось с хлопка. Того самого, который услышал только ты. Мир рассыпался на пиксели, а ты — почему-то цел. Ты не герой. Но и не статист. Твоё имя еще никто не запомнил. Исправим?»\n\nТы пришёл не по своей воле. Или по своей?\n\nТебя встретил дед в халате с фиолетовыми звездами и авоськой, полной фриспинов. Он представился Астральным Инструктажником и молча протянул тебе табличку с вопросом:\n\n❓ Что ты вообще здесь делаешь, смертный?',
                    image: 'https://picsum.photos/seed/quest1/300/200'
                },
                choices: [
                    { id: 'escapist', text: '“А можно не объяснять? Я просто хочу забыться.” 🔹 Эскапист / 🧬 Погружённый' },
                    { id: 'controller', text: '“Что за система? Где таблицы выплат и скрытые коэффициенты?” 🔹 Контролёр / 🧠 Аналитик' },
                    { id: 'predator', text: '“Судя по тебе — тут можно выигрывать. Я зашёл за победой.” 🔹 Хищник / 🧱 Гриндер' },
                    { id: 'mystic', text: '“Просто чувствовал… что должен быть здесь. Всё совпало.” 🔹 Мистик / 🪞 Нарративный' }
                ],
                timer: {
                    ends_at: new Date(Date.now() + 1800_000).toISOString(), // 30 мин
                    duration_seconds: 1800
                }
            }
        }
        // Stub для остальных дней
        return {
            currentScene: {
                id: `${day}_scene`,
                title: this.list().find(q => q.id === day)?.title || 'Stub',
                description: this.list().find(q => q.id === day)?.subtitle || 'Stub scene for other days.',
                image: `https://picsum.photos/seed/quest-${day}/300/200`
            },
            choices: [
                { id: 'finish', text: 'Завершить' }
            ],
            timer: {
                ends_at: new Date(Date.now() + 1800_000).toISOString(),
                duration_seconds: 1800
            }
        }
    }

    processChoice(choiceId: string) {
        // --- аналитика: фиксируем мотивацию ---
        if (choiceId === 'escapist' || choiceId === 'controller' || choiceId === 'predator' || choiceId === 'mystic') {
            // Переход к сцене выбора класса
            return {
                success: true,
                newScene: {
                    id: 'scene_1_class',
                    title: 'Выбор класса — или кем ты не притворяешься',
                    description:
                        'Астральный Инструктажник с видом заговорщика щёлкает пальцами, и перед тобой — три существа. Все подозрительно смотрят в твою душу. Один курит. Один мечтает. Один записывает что-то в блокнот.\n\n“Ты должен выбрать. Или они выберут тебя.”\n\n☄️ Выбери путь:\n1. Лис-Обманщик\n “Люблю хаос. И когда враг бьёт воздух. Всё — фокус.” → Хищник / Мистик\n2. Рыцарь Закона\n “Я за порядок. И если правила не работают — перепишем их по уставу.” → Контролёр / Аналитик\n3. Безымянная Тень\n “Я был везде, где ты боишься думать. Но и ты можешь быть мной. Если готов.” → Эскапист / Погружённый',
                    image: 'https://picsum.photos/seed/quest-class/300/200'
                },
                choices: [
                    { id: 'fox', text: 'Лис-Обманщик' },
                    { id: 'knight', text: 'Рыцарь Закона' },
                    { id: 'shadow', text: 'Безымянная Тень' }
                ],
                timer: {
                    ends_at: new Date(Date.now() + 1800_000).toISOString(),
                    duration_seconds: 1800
                }
            }
        }
        // --- аналитика: фиксируем психотип ---
        if (choiceId === 'fox' || choiceId === 'knight' || choiceId === 'shadow') {
            // Завершение дня, выдача награды
            return {
                success: true,
                newScene: {
                    id: 'scene_1_reward',
                    title: 'Пробуждение завершено',
                    description:
                        '🎁 Ты получаешь Кристалл Пробуждения и 20 XP\n\nОн тёплый. И, кажется, он знает, сколько у тебя осталось фишек.\n\nМира появляется. Она не представляется. Просто говорит:\n“Ты открыл глаза. А значит — мы связаны. Если ты дойдёшь до Врат, я расскажу тебе, почему ты вообще здесь. Но не раньше. У нас нет времени. Но оно у тебя есть.”',
                    image: 'https://picsum.photos/seed/quest-reward/300/200'
                },
                choices: [],
                reward: { type: 'item', name: 'Кристалл Пробуждения', xp: 20 }
            }
        }
        // Stub для остальных дней: завершение
        if (choiceId === 'finish') {
            return {
                success: true,
                newScene: {
                    id: 'scene_finish',
                    title: 'Квест завершён',
                    description: 'Спасибо за участие!',
                    image: 'https://picsum.photos/seed/quest-finish/300/200'
                },
                choices: []
            }
        }
        // Stub fallback
        return {
            success: true,
            newScene: {
                id: 'stub',
                title: 'Stub',
                description: 'Stub scene for other days.',
                image: 'https://picsum.photos/seed/quest-stub/300/200'
            },
            choices: []
        }
    }

    getRewards() {
        // Stub: только первый день с наградой
        return [
            { day: 1, bonus_code: 'AWAKE-CRYSTAL', claimed: true },
            { day: 2, bonus_code: 'CASINO50', claimed: false },
            { day: 3, bonus_code: 'PART2023', claimed: false },
            { day: 4, bonus_code: 'RANGER24', claimed: false, locked: true }
        ]
    }
}

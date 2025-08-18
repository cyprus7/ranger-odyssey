import { Injectable, Inject } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import { eq } from 'drizzle-orm'

import { db } from '../db/drizzle-client'
import { questDays } from '../db/schema'
import { RewardService } from './reward.service'
import type { QuestProgressStore } from './progress-store.interface'

function parseDayNumber(day?: string): number {
    if (!day) return 1
    const m = String(day).match(/\d+/)
    return m ? Math.max(1, Math.min(7, Number(m[0]))) : 1
}

@Injectable()
export class QuestsService {
    constructor(
    private readonly logger: PinoLogger,
    private readonly rewards: RewardService,
    @Inject('QuestProgressStore') private readonly progressStore: QuestProgressStore,
    ) {
        this.logger.setContext('QuestsService')
    }

    async list() {
        const days = await db.select().from(questDays).orderBy(questDays.dayNumber)
        return days.map(d => ({
            id: `day${d.dayNumber}`,
            title: d.title,
            subtitle: d.subtitle,
            progress: 0,
        }))
    }

    // userId обязателен (из JWT)
    async getQuestState(userId: string, day: string = 'day1') {
        const dayNumber = parseDayNumber(day)
        await this.progressStore.startIfNeeded(userId, dayNumber)

        if (dayNumber === 1) {
            return {
                currentScene: {
                    id: 'scene_1_intro',
                    title: 'День 1 — Пробуждение в Городе Мостбет',
                    description:
            '«Всё началось с хлопка. Того самого, который услышал только ты. Мир рассыпался на пиксели, а ты — почему-то цел. Ты не герой. Но и не статист. Твоё имя еще никто не запомнил. Исправим?»\n\nТы пришёл не по своей воле. Или по своей?\n\nТебя встретил дед в халате с фиолетовыми звездами и авоськой, полной фриспинов. Он представился Астральным Инструктажником и молча протянул тебе табличку с вопросом:\n\n❓ Что ты вообще здесь делаешь, смертный?',
                    image: 'https://picsum.photos/seed/quest1/300/200',
                },
                choices: [
                    { id: 'escapist', text: '“А можно не объяснять? Я просто хочу забыться.” 🔹 Эскапист / 🧬 Погружённый' },
                    { id: 'controller', text: '“Что за система? Где таблицы выплат и скрытые коэффициенты?” 🔹 Контролёр / 🧠 Аналитик' },
                    { id: 'predator', text: '“Судя по тебе — тут можно выигрывать. Я зашёл за победой.” 🔹 Хищник / 🧱 Гриндер' },
                    { id: 'mystic', text: '“Просто чувствовал… что должен быть здесь. Всё совпало.” 🔹 Мистик / 🪞 Нарративный' },
                ],
                timer: {
                    ends_at: new Date(Date.now() + 1800_000).toISOString(),
                    duration_seconds: 1800,
                },
            }
        }

        return {
            currentScene: {
                id: `day${dayNumber}_scene`,
                title: `День ${dayNumber} — (stub)`,
                description: 'Stub scene for other days.',
                image: `https://picsum.photos/seed/quest-day-${dayNumber}/300/200`,
            },
            choices: [{ id: 'finish', text: 'Завершить' }],
            timer: {
                ends_at: new Date(Date.now() + 1800_000).toISOString(),
                duration_seconds: 1800,
            },
        }
    }

    async processChoice(userId: string, day: string, choiceId: string) {
        const dayNumber = parseDayNumber(day)
        await this.progressStore.startIfNeeded(userId, dayNumber)
        await this.progressStore.setChoice(userId, dayNumber, choiceId)

        if (choiceId === 'escapist' || choiceId === 'controller' || choiceId === 'predator' || choiceId === 'mystic') {
            return {
                success: true,
                newScene: {
                    id: 'scene_1_class',
                    title: 'Выбор класса — или кем ты не притворяешься',
                    description:
            'Астральный Инструктажник с видом заговорщика щёлкает пальцами, и перед тобой — три существа. Все подозрительно смотрят в твою душу. Один курит. Один мечтает. Один записывает что-то в блокнот.\n\n“Ты должен выбрать. Или они выберут тебя.”\n\n☄️ Выбери путь:\n1. Лис-Обманщик\n “Люблю хаос. И когда враг бьёт воздух. Всё — фокус.” → Хищник / Мистик\n2. Рыцарь Закона\n “Я за порядок. И если правила не работают — перепишем их по уставу.” → Контролёр / Аналитик\n3. Безымянная Тень\n “Я был везде, где ты боишься думать. Но и ты можешь быть мной. Если готов.” → Эскапист / Погружённый',
                    image: 'https://picsum.photos/seed/quest-class/300/200',
                },
                choices: [
                    { id: 'fox', text: 'Лис-Обманщик' },
                    { id: 'knight', text: 'Рыцарь Закона' },
                    { id: 'shadow', text: 'Безымянная Тень' },
                ],
                timer: {
                    ends_at: new Date(Date.now() + 1800_000).toISOString(),
                    duration_seconds: 1800,
                },
            }
        }

        if (choiceId === 'fox' || choiceId === 'knight' || choiceId === 'shadow') {
            await this.progressStore.complete(userId, dayNumber)
            const dayRow = (await db.select().from(questDays).where(eq(questDays.dayNumber, dayNumber)).limit(1))[0]
            await this.rewards.accrueIfNeeded(userId, dayNumber, dayRow?.bonusCode ?? null)
            return {
                success: true,
                newScene: {
                    id: 'scene_1_reward',
                    title: 'Пробуждение завершено',
                    description:
            '🎁 Ты получаешь Кристалл Пробуждения и 20 XP\n\nОн тёплый. И, кажется, он знает, сколько у тебя осталось фишек.\n\nМира появляется. Она не представляется. Просто говорит:\n“Ты открыл глаза. А значит — мы связаны. Если ты дойдёшь до Врат, я расскажу тебе, почему ты вообще здесь. Но не раньше. У нас нет времени. Но оно у тебя есть.”',
                    image: 'https://picsum.photos/seed/quest-reward/300/200',
                },
                choices: [],
                reward: { type: 'item', name: 'Кристалл Пробуждения', xp: 20 },
            }
        }

        if (choiceId === 'finish') {
            await this.progressStore.complete(userId, dayNumber)
            const dayRow = (await db.select().from(questDays).where(eq(questDays.dayNumber, dayNumber)).limit(1))[0]
            await this.rewards.accrueIfNeeded(userId, dayNumber, dayRow?.bonusCode ?? null)
            return {
                success: true,
                newScene: {
                    id: 'scene_finish',
                    title: 'Квест завершён',
                    description: 'Спасибо за участие!',
                    image: 'https://picsum.photos/seed/quest-finish/300/200',
                },
                choices: [],
            }
        }

        return {
            success: true,
            newScene: {
                id: 'stub',
                title: 'Stub',
                description: 'Stub scene for other days.',
                image: 'https://picsum.photos/seed/quest-stub/300/200',
            },
            choices: [],
        }
    }

    async getRewards(userId: string) {
        return this.rewards.getAllForUser(userId)
    }
}

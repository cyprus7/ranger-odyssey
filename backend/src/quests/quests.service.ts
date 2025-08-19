import { Injectable, Inject } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import { and, eq } from 'drizzle-orm'

import { db } from '../db/drizzle-client'
import { questDays, questProgress } from '../db/schema'
import { RewardService } from './reward.service'
import type { QuestProgressStore } from './progress-store.interface'


interface Card {
    id: string;
    art?: string;
}

interface Scene {
    id: string;
    text: string;
    choices: { id, label }[]
}

interface SceneContainer {
    cards?: Card[];
    scenes?: Scene[];
}


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

    async list(userId: string) {
        const [days, progress] = await Promise.all([
            db.select().from(questDays).where(eq(questDays.isActive, true)).orderBy(questDays.dayNumber),
            db.select().from(questProgress).where(eq(questProgress.userId, userId))
        ])

        const progByDay = new Map(progress.map(r => [r.dayNumber, r]))
        
        return days.map(d => {
            const questProgress = progByDay.get(d.dayNumber)
            
            let questStatus
            if (questProgress) {
                questStatus = questProgress.status
            } else if (d.dayNumber === 1) {
                questStatus = d.dayNumber === 1 ? 'available' : 'locked'
            }
            return {
                id: `day${d.dayNumber}`,
                title: d.title,
                subtitle: d.subtitle,
                status: questStatus === 'not_started' ? 'available' : questStatus,
                progress: 0,
            }
        })
    }

    // userId обязателен (из JWT)
    async getQuestState(userId: string) {
        // наверно надо получать сцены
        // выбор меняет параметры и переключает сцену - сцену сохраням
        // целиком квест не отдаем клиенту. только сцену тут
        // другие методы для работы с квестами - обновление квеста (дня) целиком
        // для игрока мы кешируем в редисе день и его состояние на минут 30 возможно при обновлении куки обновим ключик - состояние игрок:квест только одно
        // можно и дни кешировать. может быть отдельный сервис для квестов далее

        // отдавать клиенту выборы без данных об эффктах  {
        //   "id": "scene_2_choice",
        //   "text": "Башня гудит. Лис кивает на кристалл...",
        //   "choices": [
        //     {"id":"risk_spin","label":"Кручу. Жизнь — игра","effects":[{"type":"grant_fs","value":15},{"type":"tag","key":"risk_pos","op":"inc","value":1}]},
        //     {"id":"learn_rtp","label":"Где RTP и вейджер?","next":"scene_2_archive","effects":[{"type":"tag","key":"analyst","op":"inc","value":1}]},
        //     {"id":"skip","label":"Пока пас","effects":[{"type":"tag","key":"risk_avoid","op":"inc","value":1}]}
        //   ]
        // }
        let dayNumber = 1
        let questState = await this.progressStore.startIfNeeded(userId, dayNumber)
        while (questState.status !== 'in_progress') {
            dayNumber++
            questState = await this.progressStore.startIfNeeded(userId, dayNumber)
        }

        const questDay = (await db
            .select()
            .from(questDays)
            .where(and(eq(questDays.isActive, true), eq(questDays.dayNumber, dayNumber))))[0] ?? null

        if (!questDay) {
            return {
                currentScene: {
                    id: `day${dayNumber}_scene`,
                    title: `День ${dayNumber} — (stub)`,
                    description: 'Stub scene for other days.',
                    image: `https://picsum.photos/seed/quest-day-${dayNumber}/300/200`,
                },
                choices: [{ id: 'finish', text: 'Завершить' }],
            }
        }
        //           "day": 1,
        //   "cards": [
        //     {
        //       "id": "scene_1_intro",
        //       "art": "https://picsum.photos/seed/quest-class/300/200",
        //       "cta": "Использовать Кристалл"
        //     }
        //   ],
        // let currentSceneId = (questState.state as { currentSceneId?: string }).currentSceneId

        const sceneContainer = questDay.scene as SceneContainer

        let currentSceneId = sceneContainer.cards?.[0]?.id
        
        if (!currentSceneId) {
            currentSceneId = (questDay.scene as { cards?: Card[] }).cards?.[0]?.id
        }

        const currentScene = sceneContainer.scenes?.find(scene => scene.id === currentSceneId)

        if (!currentScene) {
            return {
                currentScene: {
                    id: `day${dayNumber}_scene`,
                    title: `День ${dayNumber} — (stub for error)`,
                    description: 'Stub scene for error.',
                    image: `https://picsum.photos/seed/quest-day-${dayNumber}-/300/200`,
                },
                choices: [{ id: 'finish', text: 'Завершить квест' }],
            }
        }

        // if (dayNumber === 1) {
        return {
            currentScene: {
                id: currentSceneId,
                title: `День ${dayNumber}`,
                description: currentScene.text,
            
                image: sceneContainer.cards?.[0].art,
            },
            choices: currentScene.choices.map(({ id, label }) => ({ id, text: label })),
            timer: {
                ends_at: new Date(Date.now() + 1800_000).toISOString(),
                duration_seconds: 1800,
            },
        }
        // }

        // return {
        //     currentScene: {
        //         id: `day${dayNumber}_scene`,
        //         title: `День ${dayNumber} — (stub)`,
        //         description: 'Stub scene for other days.',
        //         image: `https://picsum.photos/seed/quest-day-${dayNumber}/300/200`,
        //     },
        //     choices: [{ id: 'finish', text: 'Завершить' }],
        //     timer: {
        //         ends_at: new Date(Date.now() + 1800_000).toISOString(),
        //         duration_seconds: 1800,
        //     },
        // }
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

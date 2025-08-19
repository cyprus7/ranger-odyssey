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
    choices: { id, label, next }[]
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

        let currentSceneId = questState.state ? (questState.state as { currentSceneId?: string }).currentSceneId : null
        
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

        let currentSceneId = questState.state ? (questState.state as { currentSceneId?: string }).currentSceneId : null
        
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

        const nextSceneId = currentScene.choices.find(next => next.next === choiceId)

        if (!nextSceneId) {
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

        // сохраняем
        await db
            .update(questProgress)
            .set({ lastChoiceId: choiceId, state: { currentSceneId: nextSceneId}, updatedAt: new Date() })
            .where(and(eq(questProgress.userId, userId), eq(questProgress.dayNumber, dayNumber)))

        // return {
        //     currentScene: {
        //         id: currentSceneId,
        //         title: `День ${dayNumber}`,
        //         description: currentScene.text,
            
        //         image: sceneContainer.cards?.[0].art,
        //     },
        //     choices: currentScene.choices.map(({ id, label }) => ({ id, text: label })),
        //     timer: {
        //         ends_at: new Date(Date.now() + 1800_000).toISOString(),
        //         duration_seconds: 1800,
        //     },
        // }

        return this.getQuestState(userId)
    }

    async getRewards(userId: string) {
        return this.rewards.getAllForUser(userId)
    }
}

import { Injectable, Inject } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import { RewardService } from './reward.service'
import type { QuestProgressStore, QuestProgressRow } from './progress-store.interface'
import { questDays, questProgress } from '../db/schema'
import { db } from '../db/drizzle-client'
import { and, eq } from 'drizzle-orm'


interface Card {
    id: string;
    art?: string;
}

interface Scene {
    id: string;
    text: string;
    choices: { id: string; label: string; next?: string }[]
}

interface SceneContainer {
    cards?: Card[];
    scenes?: Scene[];
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
        // Получаем все дни и весь прогресс пользователя
        const days = await db.select().from(questDays).where(eq(questDays.isActive, true)).orderBy(questDays.dayNumber)
        // Получаем все строки прогресса пользователя
        // const progressRows = await db.select().from(questDays)
        // Здесь должен быть select из questProgress, а не questDays:
        // const progressRows = await db.select().from(questProgress).where(eq(questProgress.userId, userId))
        // Исправьте на:
        // const progressRows = await db.select().from(questProgress).where(eq(questProgress.userId, userId))

        // Для примера:
        const userProgress = await db.select().from(questProgress).where(eq(questProgress.userId, userId))
        const progByDay = new Map(userProgress.map(r => [r.dayNumber, r]))

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

    async getQuestState(userId: string) {
        let dayNumber = 1
        let questState: QuestProgressRow = await this.progressStore.startIfNeeded(userId, dayNumber)
        while (questState.status !== 'in_progress') {
            dayNumber++
            questState = await this.progressStore.startIfNeeded(userId, dayNumber)
        }

        const questDay = await this.getQuestDay(dayNumber)
        if (!questDay) {
            return this.stubScene(dayNumber)
        }

        const sceneContainer = questDay.scene as SceneContainer
        let currentSceneId = questState.state && typeof questState.state === 'object'
            ? (questState.state as { currentSceneId?: string }).currentSceneId
            : undefined

        if (!currentSceneId) {
            currentSceneId = sceneContainer.cards?.[0]?.id
            await this.progressStore.setChoice(userId, dayNumber, null, { currentSceneId })
        }

        const currentScene = sceneContainer.scenes?.find(scene => scene.id === currentSceneId)
        if (!currentScene) {
            return this.stubScene(dayNumber, true)
        }

        return {
            currentScene: {
                id: currentSceneId,
                title: `День ${dayNumber}`,
                description: currentScene.text,
                image: sceneContainer.cards?.[0]?.art,
            },
            choices: currentScene.choices.map(({ id, label }) => ({ id, text: label })),
            timer: {
                ends_at: new Date(Date.now() + 1800_000).toISOString(),
                duration_seconds: 1800,
            },
        }
    }

    async processChoice(userId: string, choiceId: string) {
        let dayNumber = 1
        let questState: QuestProgressRow = await this.progressStore.startIfNeeded(userId, dayNumber)
        while (questState.status !== 'in_progress') {
            dayNumber++
            questState = await this.progressStore.startIfNeeded(userId, dayNumber)
        }

        const questDay = await this.getQuestDay(dayNumber)
        if (!questDay) {
            return this.stubScene(dayNumber)
        }

        const sceneContainer = questDay.scene as SceneContainer
        let currentSceneId = questState.state && typeof questState.state === 'object'
            ? (questState.state as { currentSceneId?: string }).currentSceneId
            : undefined

        if (!currentSceneId) {
            currentSceneId = sceneContainer.cards?.[0]?.id
        }

        const currentScene = sceneContainer.scenes?.find(scene => scene.id === currentSceneId)
        if (!currentScene) {
            // Попытка перехода к следующему дню, если сцена не найдена
            const nextDay = await this.getQuestDay(dayNumber + 1)
            if (nextDay) {
                await this.progressStore.complete(userId, dayNumber)
                return this.stubScene(dayNumber + 1)
            }
            return this.stubScene(dayNumber, true)
        }

        const nextScene = currentScene.choices.find(next => next.id === choiceId)
        if (!nextScene) {
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

        await this.progressStore.setChoice(userId, dayNumber, choiceId, { currentSceneId: nextScene.next })

        // Можно вернуть актуальное состояние через getQuestState, если нужно
        return {
            success: true,
            newScene: {
                id: nextScene.next ?? choiceId,
                title: 'Stub',
                description: '...',
                image: 'https://picsum.photos/seed/quest-stub/300/200',
            },
            choices: [],
        }
    }

    async getRewards(userId: string) {
        return this.rewards.getAllForUser(userId)
    }

    // Вспомогательные методы
    private async getQuestDay(dayNumber: number) {
        const days = await db
            .select()
            .from(questDays)
            .where(and(eq(questDays.isActive, true), eq(questDays.dayNumber, dayNumber)))
        return days[0] ?? null
    }

    private stubScene(dayNumber: number, error = false) {
        return {
            currentScene: {
                id: `day${dayNumber}_scene`,
                title: error
                    ? `День ${dayNumber} — (stub for error)`
                    : `День ${dayNumber} — (stub)`,
                description: error
                    ? 'Stub scene for error.'
                    : 'Stub scene for other days.',
                image: `https://picsum.photos/seed/quest-day-${dayNumber}/300/200`,
            },
            choices: [{ id: 'finish', text: 'Завершить квест' }],
        }
    }
}

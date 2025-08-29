import { Injectable, Inject } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import { RewardService } from '../rewards/reward.service'
import type { QuestProgressStore, QuestProgressRow } from './progress-store.interface'
import { questDays, questProgress } from '../db/schema'
import { db } from '../db/drizzle-client'
import { and, eq } from 'drizzle-orm'
import type pino from 'pino'
import { withOtelSpan } from '../observability/otel-helpers'


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

    async list(userId: string, logger?: pino.Logger, trace_id?: string) {
        // Получаем все дни и весь прогресс пользователя
        const days = await withOtelSpan('postgres.select_days', () =>
            db.select().from(questDays).where(eq(questDays.isActive, true)).orderBy(questDays.dayNumber),
        { dep: 'postgres' }
        )

        // Получаем все строки прогресса пользователя
        // const progressRows = await db.select().from(questDays)
        // Здесь должен быть select из questProgress, а не questDays:
        // const progressRows = await db.select().from(questProgress).where(eq(questProgress.userId, userId))
        // Исправьте на:
        // const progressRows = await db.select().from(questProgress).where(eq(questProgress.userId, userId))

        // Для примера:
        const userProgress = await withOtelSpan('postgres.select_user_progress', () =>
            db.select().from(questProgress).where(eq(questProgress.userId, userId)),
        { dep: 'postgres' }
        )
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

    async getQuestState(userId: string, logger?: pino.Logger, trace_id?: string) {
        let dayNumber = 1
        let questState: QuestProgressRow = await withOtelSpan('store.startIfNeeded', () =>
            this.progressStore.startIfNeeded(userId, dayNumber),
        { dep: 'postgres' }
        )
        while (questState.status !== 'in_progress') {
            dayNumber++
            questState = await withOtelSpan('store.startIfNeeded', () =>
                this.progressStore.startIfNeeded(userId, dayNumber),
            { dep: 'postgres' }
            )
        }

        const questDay = await this.getQuestDay(dayNumber, logger, trace_id ?? userId)
        if (!questDay) {
            return this.stubScene(dayNumber)
        }

        const sceneContainer = questDay.scene as SceneContainer
        let currentSceneId = questState.state && typeof questState.state === 'object'
            ? (questState.state as { currentSceneId?: string }).currentSceneId
            : undefined

        if (!currentSceneId) {
            currentSceneId = sceneContainer.cards?.[0]?.id
            await withOtelSpan('store.setChoice', () =>
                this.progressStore.setChoice(userId, dayNumber, null, { currentSceneId }),
            { dep: 'postgres' }
            )
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
            choices: (currentScene.choices ?? []).map(({ id, label }) => ({ id, text: label })),
            timer: {
                ends_at: new Date(Date.now() + 1800_000).toISOString(),
                duration_seconds: 1800,
            },
        }
    }

    async processChoice(userId: string, choiceId: string, logger?: pino.Logger, trace_id?: string) {
        let dayNumber = 1
        let questState: QuestProgressRow = await withOtelSpan('store.startIfNeeded', () =>
            this.progressStore.startIfNeeded(userId, dayNumber),
        { dep: 'postgres' }
        )
        while (questState.status !== 'in_progress') {
            dayNumber++
            questState = await withOtelSpan('store.startIfNeeded', () =>
                this.progressStore.startIfNeeded(userId, dayNumber),
            { dep: 'postgres' }
            )
        }

        const questDay = await this.getQuestDay(dayNumber, logger, trace_id ?? userId)
        if (!questDay) {
            return this.getQuestState(userId)
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
            const nextDay = await this.getQuestDay(dayNumber + 1, logger, trace_id ?? userId)
            if (nextDay) {
                await withOtelSpan('store.setChoice', () =>
                    this.progressStore.setChoice(userId, dayNumber, choiceId, { currentSceneId: null }),
                { dep: 'postgres' }
                )
                await withOtelSpan('store.complete', () =>
                    this.progressStore.complete(userId, dayNumber),
                { dep: 'postgres' }
                )
                return this.getQuestState(userId)
            }
            return this.getQuestState(userId)
        }

        const nextScene = (currentScene.choices ?? []).find(next => next.id === choiceId)
        if (!nextScene) {
            return this.getQuestState(userId)
        }

        // Если у выбранного варианта нет поля `next` — это конец дня.
        // Сохраняем выбор и переводим день в completed, затем возвращаем новое состояние.
        if (!nextScene.next) {
            await withOtelSpan('store.setChoice', () =>
                this.progressStore.setChoice(userId, dayNumber, choiceId, { currentSceneId: null }),
            { dep: 'postgres' }
            )
            await withOtelSpan('store.complete', () =>
                this.progressStore.complete(userId, dayNumber),
            { dep: 'postgres' }
            )
            return this.getQuestState(userId)
        }

        const targetSceneId = nextScene.next
        // Если target сцена принадлежит текущему дню — обычный переход
        const targetInCurrent = sceneContainer.scenes?.some(s => s.id === targetSceneId)
        if (targetInCurrent) {
            await withOtelSpan('store.setChoice', () =>
                this.progressStore.setChoice(userId, dayNumber, choiceId, { currentSceneId: targetSceneId }),
            { dep: 'postgres' }
            )
            return this.getQuestState(userId)
        }

        // Иначе — попробуем найти target в следующем дне (переход между днями)
        const nextDay = await this.getQuestDay(dayNumber + 1, logger, trace_id ?? userId)
        if (nextDay) {
            const nextContainer = nextDay.scene as SceneContainer
            const targetInNext = nextContainer.scenes?.some(s => s.id === targetSceneId)
            if (targetInNext) {
                // Сохраняем выбор текущего дня, помечаем его completed
                await withOtelSpan('store.setChoice', () =>
                    this.progressStore.setChoice(userId, dayNumber, choiceId, { currentSceneId: null }),
                { dep: 'postgres' }
                )
                await withOtelSpan('store.complete', () =>
                    this.progressStore.complete(userId, dayNumber),
                { dep: 'postgres' }
                )

                // Инициализируем следующий день и выставляем в его state нужную сцену
                await withOtelSpan('store.startIfNeeded', () =>
                    this.progressStore.startIfNeeded(userId, dayNumber + 1),
                { dep: 'postgres' }
                )
                await withOtelSpan('store.setChoice', () =>
                    this.progressStore.setChoice(userId, dayNumber + 1, null, { currentSceneId: targetSceneId }),
                { dep: 'postgres' }
                )
                return this.getQuestState(userId)
            }
        }

        // Не нашли target ни в текущем, ни в следующем дне — безопасно завершить текущий день
        await withOtelSpan('store.setChoice', () =>
            this.progressStore.setChoice(userId, dayNumber, choiceId, { currentSceneId: null }),
        { dep: 'postgres' }
        )
        await withOtelSpan('store.complete', () =>
            this.progressStore.complete(userId, dayNumber),
        { dep: 'postgres' }
        )
        return this.getQuestState(userId)
    }

    async getRewards(userId: string, logger?: pino.Logger, trace_id?: string) {
        return this.rewards.getAll(userId, logger, trace_id)
    }

    async resetQuest(userId: string, logger?: pino.Logger, trace_id?: string) {
        // Reset quest progress by deleting all entries for the user
        await withOtelSpan('postgres.delete_user_progress', () =>
            db.delete(questProgress).where(eq(questProgress.userId, userId)),
        { dep: 'postgres' }
        )
        // Then return the initial state
        return this.getQuestState(userId, logger, trace_id)
    }

    // Вспомогательные методы
    private async getQuestDay(dayNumber: number, logger?: pino.Logger, trace_id?: string) {
        const days = await withOtelSpan('postgres.select_day', () =>
            db.select().from(questDays).where(and(eq(questDays.isActive, true), eq(questDays.dayNumber, dayNumber))),
        { dep: 'postgres' }
        )
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

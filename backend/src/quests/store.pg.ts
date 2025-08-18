import { Injectable } from '@nestjs/common'
import { db } from '../db/drizzle-client'
import { questProgress } from '../db/schema'
import { and, eq } from 'drizzle-orm'
import type { QuestProgressRow, QuestProgressStore } from './progress-store.interface'

@Injectable()
export class PostgresQuestProgressStore implements QuestProgressStore {
    async get(userId: string, dayNumber: number): Promise<QuestProgressRow | null> {
        const rows = await db
            .select()
            .from(questProgress)
            .where(and(eq(questProgress.userId, userId), eq(questProgress.dayNumber, dayNumber)))
            .limit(1)
        return rows[0] ?? null
    }

    async startIfNeeded(userId: string, dayNumber: number): Promise<QuestProgressRow> {
        const existing = await this.get(userId, dayNumber)
        if (existing) return existing
        await db
            .insert(questProgress)
            .values({ userId, dayNumber, status: 'in_progress' })
            .onConflictDoNothing()
        return (await this.get(userId, dayNumber))!
    }

    async setChoice(userId: string, dayNumber: number, choiceId: string, state?: unknown): Promise<void> {
        await db
            .update(questProgress)
            .set({ lastChoiceId: choiceId, state, updatedAt: new Date() })
            .where(and(eq(questProgress.userId, userId), eq(questProgress.dayNumber, dayNumber)))
    }

    async complete(userId: string, dayNumber: number): Promise<void> {
        await db
            .update(questProgress)
            .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
            .where(and(eq(questProgress.userId, userId), eq(questProgress.dayNumber, dayNumber)))
    }
}

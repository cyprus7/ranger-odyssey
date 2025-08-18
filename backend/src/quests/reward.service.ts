import { Injectable } from '@nestjs/common'
import { db } from '../db/drizzle-client'
import { questRewards, questDays, questProgress, type rewardStatusEnum } from '../db/schema'
import { eq } from 'drizzle-orm'

export type RewardStatus = (typeof rewardStatusEnum)['enumValues'][number] // 'accrued'|'issuing'|'claimed'

@Injectable()
export class RewardService {
    async getAllForUser(userId: string) {
        const [days, progressRows, rewardRows] = await Promise.all([
            db.select().from(questDays).where(eq(questDays.isActive, true)).orderBy(questDays.dayNumber),
            db.select().from(questProgress).where(eq(questProgress.userId, userId)),
            db.select().from(questRewards).where(eq(questRewards.userId, userId)),
        ])
        const progByDay = new Map(progressRows.map(r => [r.dayNumber, r]))
        const rewByDay  = new Map(rewardRows.map(r => [r.dayNumber, r]))
        return days.map(d => {
            const prog = progByDay.get(d.dayNumber)
            const rew  = rewByDay.get(d.dayNumber)
            const completed = prog?.status === 'completed'
            const status: RewardStatus | 'locked' = completed ? (rew?.status ?? 'accrued') : 'locked'
            return {
                day: d.dayNumber,
                bonus_code: d.bonusCode ?? null,
                status,
                claimed: status === 'claimed',
                locked: status === 'locked',
            }
        })
    }

    async accrueIfNeeded(userId: string, dayNumber: number, bonusCode?: string | null) {
    // если нет записи — создаём "accrued"
        await db
            .insert(questRewards)
            .values({ userId, dayNumber, status: 'accrued', bonusCode: bonusCode ?? null })
            .onConflictDoNothing()
    }

    async setStatus(userId: string, dayNumber: number, status: RewardStatus) {
        await db
            .insert(questRewards)
            .values({ userId, dayNumber, status })
            .onConflictDoUpdate({
                target: [questRewards.userId, questRewards.dayNumber],
                set: { status, updatedAt: new Date() },
            })
    }
}

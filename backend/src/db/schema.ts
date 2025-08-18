import { pgTable, uuid, bigint, text, timestamp, uniqueIndex, integer, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core'

export const accountLinks = pgTable(
    'account_links',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        telegramUserId: bigint('telegram_user_id', { mode: 'bigint' }).notNull(),
        siteId: text('site_id').notNull(),
        siteUserId: text('site_user_id').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => ({
        uxTgSite: uniqueIndex('ux_account_links_tg_site').on(t.telegramUserId, t.siteId),
        uxSiteUser: uniqueIndex('ux_account_links_site_user').on(t.siteId, t.siteUserId),
    }),
)

// ====== Quests: days, per-user progress, rewards ======
export const rewardStatusEnum = pgEnum('reward_status', ['accrued', 'issuing', 'claimed'])
export const questStatusEnum  = pgEnum('quest_status',  ['not_started', 'in_progress', 'completed'])

export const questDays = pgTable(
    'quest_days',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        dayNumber: integer('day_number').notNull().unique(),
        code: text('code').notNull().unique(), // напр. "day1"
        title: text('title').notNull(),
        subtitle: text('subtitle').notNull(),
        bonusCode: text('bonus_code'), // промокод/бонус за день (опционально)
        isActive: boolean('is_active').notNull().default(true),
        scene: jsonb('scene'), // задел на хранение сцены; необязателен
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
)

export const questProgress = pgTable(
    'quest_progress',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: text('user_id').notNull(),
        dayNumber: integer('day_number').notNull(),
        status: questStatusEnum('status').notNull().default('in_progress'),
        lastChoiceId: text('last_choice_id'),
        state: jsonb('state'), // произвольное состояние прохождения
        startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
        completedAt: timestamp('completed_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => ({
        uxUserDay: uniqueIndex('ux_progress_user_day').on(t.userId, t.dayNumber),
    }),
)

export const questRewards = pgTable(
    'quest_rewards',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: text('user_id').notNull(),
        dayNumber: integer('day_number').notNull(),
        status: rewardStatusEnum('status').notNull(),
        bonusCode: text('bonus_code'),
        externalRef: text('external_ref'),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => ({
        uxRewardUserDay: uniqueIndex('ux_rewards_user_day').on(t.userId, t.dayNumber),
    }),
)

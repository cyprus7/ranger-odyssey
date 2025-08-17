import { pgTable, uuid, bigint, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

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

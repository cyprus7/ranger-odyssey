import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    max: Number(process.env.PG_POOL_MAX ?? 10),
})

export const db = drizzle(pool, { schema })
export { pool }

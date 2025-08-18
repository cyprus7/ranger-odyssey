export type QuestStatus = 'not_started' | 'in_progress' | 'completed'

export interface QuestProgressRow {
  userId: string
  dayNumber: number
  status: QuestStatus
  lastChoiceId?: string | null
  state?: unknown
  startedAt?: Date
  completedAt?: Date | null
}

export interface QuestProgressStore {
  get(userId: string, dayNumber: number): Promise<QuestProgressRow | null>
  startIfNeeded(userId: string, dayNumber: number): Promise<QuestProgressRow>
  setChoice(userId: string, dayNumber: number, choiceId: string, state?: unknown): Promise<void>
  complete(userId: string, dayNumber: number): Promise<void>
}

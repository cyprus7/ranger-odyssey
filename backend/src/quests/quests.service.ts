import { Injectable } from '@nestjs/common';

@Injectable()
export class QuestsService {
  list() {
    return [
      { id: 'day1', title: 'День 1 — Бюрократида', subtitle: 'Пройти таможню станции', progress: 0 },
      { id: 'day2', title: 'День 2 — Казино-кластер', subtitle: 'Сделать выбор на ставке', progress: 40 },
      { id: 'day3', title: 'День 3 — Гравицаппа', subtitle: 'Добыть деталь у барыги', progress: 0 }
    ];
  }

  getQuestState() {
    // Stub implementation
    return {
      currentScene: {
        id: 'casino-scene-1',
        title: 'Казино-кластер',
        description: 'Вы стоите перед игровым автоматом. Что будете делать?',
        image: 'https://via.placeholder.com/300x200?text=Casino'
      },
      choices: [
        { id: 'bet-small', text: 'Сделать маленькую ставку' },
        { id: 'bet-medium', text: 'Сделать среднюю ставку' },
        { id: 'bet-large', text: 'Сделать крупную ставку' },
        { id: 'walk-away', text: 'Уйти' }
      ],
      timer: {
        ends_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        duration_seconds: 3600
      }
    };
  }

  processChoice(choiceId: string) {
    // Stub implementation
    return {
      success: true,
      newScene: {
        id: 'casino-result',
        title: 'Результат ставки',
        description: `Вы выбрали ${choiceId}. Колесо фортуны крутится...`,
        image: 'https://via.placeholder.com/300x200?text=Result'
      },
      reward: choiceId === 'bet-large' ? { type: 'coins', amount: 100 } : null
    };
  }

  getRewards() {
    // Stub implementation
    return [
      { day: 1, bonus_code: 'WELCOME23', claimed: true },
      { day: 2, bonus_code: 'CASINO50', claimed: true },
      { day: 3, bonus_code: 'PART2023', claimed: false },
      { day: 4, bonus_code: 'RANGER24', claimed: false, locked: true }
    ];
  }
}

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
}

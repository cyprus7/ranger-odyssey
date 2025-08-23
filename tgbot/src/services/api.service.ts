import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { JwtService } from './jwt.service'

@Injectable()
export class ApiService {
  private readonly baseUrl: string

  constructor(private readonly config: ConfigService, private readonly jwt: JwtService) {
    this.baseUrl = this.config.get<string>('API_URL', 'http://localhost:3001/api')
  }

  private authHeader(userId: string) {
    return { Authorization: `Bearer ${this.jwt.sign(userId)}` }
  }

  async getQuestState(userId: string) {
    const { data } = await axios.get(`${this.baseUrl}/quests/state`, { headers: this.authHeader(userId) })
    return data
  }

  async makeChoice(userId: string, choiceId: string) {
    const { data } = await axios.put(`${this.baseUrl}/quests/choice`, { choiceId }, { headers: this.authHeader(userId) })
    return data
  }
}

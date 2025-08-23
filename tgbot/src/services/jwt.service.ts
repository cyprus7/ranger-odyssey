import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as jwt from 'jsonwebtoken'

@Injectable()
export class JwtService {
  private readonly secret: string
  private readonly ttl: number

  constructor(private readonly config: ConfigService) {
    this.secret = this.config.get<string>('JWT_SECRET', '')
    this.ttl = Number(this.config.get<string>('JWT_TTL_SEC', '900'))
  }

  sign(userId: string) {
    return jwt.sign({ uId: userId, tgId: userId, tp: 'tg' as const }, this.secret, { expiresIn: this.ttl })
  }
}

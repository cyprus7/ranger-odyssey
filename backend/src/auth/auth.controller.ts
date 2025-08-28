import { Body, Controller, Post, Res, BadRequestException, Req } from '@nestjs/common'
import type { Response } from 'express'
import { AuthService } from './auth.service'
import { PinoLogger } from 'nestjs-pino'
import type pino from 'pino'

interface TelegramAuthRequest {
    initData: string;
    startParamRaw?: string;
}

@Controller('auth')
export class AuthController {
    constructor(
        private readonly auth: AuthService,
        private readonly logger: PinoLogger,  // добавили логгер
    ) {
        this.logger.setContext(AuthController.name)
    }

    @Post('telegram')
    async telegram(
        @Body() body: TelegramAuthRequest,
        @Res({ passthrough: true }) res: Response,
        @Req() req: { logger?: pino.Logger; trace_id?: string },
    ) {
        const { initData, startParamRaw } = body
        if (!initData) throw new BadRequestException('initData required')

        try {
            const { jwt, maxAgeMs, player_name } = await this.auth.handleTelegramAuth(
                initData,
                { startParamRaw },
                req.logger,
                req.trace_id,
            )
            res.cookie(
                process.env.COOKIE_NAME ?? 'app_access',
                jwt,
                {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none',
                    path: '/',
                    maxAge: maxAgeMs,
                },
            )
            return { ok: true, player_name: player_name ?? null }
        } catch (error) {
            this.logger.error({ err: error }, 'Telegram auth failed')  // логируем полный стектрейс
            throw error
        }
    }
}

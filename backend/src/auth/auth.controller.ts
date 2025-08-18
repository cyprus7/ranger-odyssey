import { Body, Controller, Post, Res, BadRequestException } from '@nestjs/common'
import type { Response } from 'express'
import { AuthService } from './auth.service'
import { PinoLogger } from 'nestjs-pino'

interface TelegramAuthRequest {
    initData: string;
    startParamRaw?: string;
    startPayload?: { site_id: string; user_id: string; ts: number; nonce: string; deeplink?: string; sign: string };
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
    ) {
        const { initData, startParamRaw, startPayload } = body
        if (!initData) throw new BadRequestException('initData required')

        try {
            const { jwt, maxAgeMs } = await this.auth.handleTelegramAuth(
                initData,
                { startParamRaw, startPayload },
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
            return { ok: true }
        } catch (error) {
            this.logger.error({ err: error }, 'Telegram auth failed')  // логируем полный стектрейс
            throw error
        }
    }
}

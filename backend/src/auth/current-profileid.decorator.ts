import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const CurrentProfileId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user?: { id: string, pid: string } }>()
    return req.user?.pid
})

import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const CurrentProfileId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ pid: string }>()
    return req.pid
})

import { NextRequest, NextResponse } from 'next/server'
import logger from './app/utils/logger'

export function middleware(req: NextRequest) {
    const { method, url, headers } = req
    logger.info({
        method,
        url,
        headers: {
            host: headers.get('host'),
            userAgent: headers.get('user-agent'),
            referer: headers.get('referer'),
        },
    }, 'Incoming request')

    return NextResponse.next()
}
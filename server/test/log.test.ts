import { describe, expect, it } from 'vitest'
import { createLogger } from '../src/log.ts'

describe('createLogger', () => {
  it('writes one JSON object per line in json mode', () => {
    const lines: string[] = []
    const log = createLogger('json', (l) => lines.push(l))
    log.info('request', { requestId: 'r1', status: 200 })
    log.error('boom', new Error('bad', { cause: new Error('root') }))

    const [info, error] = lines.map((l) => JSON.parse(l) as Record<string, unknown>)
    expect(info).toMatchObject({ level: 'info', msg: 'request', requestId: 'r1', status: 200 })
    expect(Date.parse(info!['time'] as string)).not.toBeNaN()
    expect(error).toMatchObject({
      level: 'error',
      msg: 'boom',
      details: { name: 'Error', message: 'bad', cause: { message: 'root' } },
    })
  })

  it('uses the console in text mode', () => {
    expect(createLogger('text')).toBe(console)
  })
})

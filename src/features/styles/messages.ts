import type { NoticeMessage } from '@/components/ui'
import type { GenerationErrorKind, GenerationStage } from './generation/types'

export const GENERATION_ERROR_MESSAGES: Record<
  Exclude<GenerationErrorKind, 'cancelled'>,
  NoticeMessage
> = {
  'invalid-input': {
    title: 'This photo can’t be styled',
    description: 'Go back and crop your photo again, or choose a different one.',
  },
  timeout: {
    title: 'That took too long',
    description: 'The style didn’t finish in time. Try again.',
  },
  'rate-limited': {
    title: 'Too many requests',
    description: 'Please wait a moment, then try again.',
  },
  network: {
    title: 'Connection problem',
    description: 'Check your internet connection and try again.',
  },
  'payment-required': {
    title: 'Credits needed',
    description: 'This style uses a credit, or you’ve used today’s free generations.',
  },
  'provider-error': {
    title: 'Generation failed',
    description: 'Something went wrong while creating this style. Try again.',
  },
}

export function stageLabel(stage: GenerationStage, runsOnDevice: boolean): string {
  switch (stage) {
    case 'queued':
      return 'Getting ready…'
    case 'processing':
      return runsOnDevice ? 'Applying preview filter on your device…' : 'Generating your avatar…'
    case 'finalizing':
      return 'Finishing up…'
  }
}

import { Dumbbell, Flame, Hand, Heart, Laugh, type LucideIcon } from 'lucide-react-native'

import type { ReactionType } from '@/lib/api/types'

export const STORY_REACTION_ICONS: Record<ReactionType, LucideIcon> = {
  heart: Heart,
  fire: Flame,
  laugh: Laugh,
  clap: Hand,
  muscle: Dumbbell,
}

export const STORY_REACTION_ORDER: ReactionType[] = ['heart', 'fire', 'laugh', 'clap', 'muscle']

import {
  Briefcase,
  CloudRain,
  Heart,
  Leaf,
  Moon,
  Smile,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react-native'

import type { CoupleMood } from '@/lib/couple/moods'

// Un icono por estado: los mismos glifos que la web, y los mismos conceptos que
// el widget de iOS dibuja con SF Symbols (ver targets/widget/CoupleWidget.swift).
export const MOOD_ICONS: Record<CoupleMood, LucideIcon> = {
  happy: Smile,
  loving: Heart,
  excited: Sparkles,
  calm: Leaf,
  tired: Moon,
  busy: Briefcase,
  stressed: Zap,
  sad: CloudRain,
}

import { Bomb, BrickWall, CircleDot, CloudRain, Cookie, Droplets, Flame, Footprints, Sparkles } from "lucide-react";
import type { EffectId } from "@gift-chaos/shared";
export function EffectIcon({ effect, size = 24 }: { effect: EffectId; size?: number }) {
  const props = { size, strokeWidth: 2.4 };
  if (effect === "bomb") return <Bomb {...props}/>;
  if (effect === "brick") return <BrickWall {...props}/>;
  if (effect === "bucket") return <Droplets {...props}/>;
  if (effect === "toilet") return <CloudRain {...props}/>;
  if (effect === "shoe") return <Footprints {...props}/>;
  if (effect === "donut") return <Cookie {...props}/>;
  if (effect === "meteor") return <Flame {...props}/>;
  if (effect === "tomato") return <CircleDot {...props}/>;
  return <Sparkles {...props}/>;
}

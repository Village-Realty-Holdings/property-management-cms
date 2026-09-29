import { createElement } from "react"
import {
  AccessibilityIcon,
  AirVentIcon,
  BabyIcon,
  BathIcon,
  BeefIcon,
  CableCarIcon,
  CarFrontIcon,
  CircleCheckIcon,
  CookingPotIcon,
  EvChargerIcon,
  FenceIcon,
  FlameIcon,
  FootprintsIcon,
  Gamepad2Icon,
  HeaterIcon,
  MountainSnowIcon,
  PawPrintIcon,
  SailboatIcon,
  SnowflakeIcon,
  SunIcon,
  TreePalmIcon,
  TreePineIcon,
  TvIcon,
  UmbrellaIcon,
  WashingMachineIcon,
  WavesIcon,
  WavesLadderIcon,
  WifiIcon,
  ArrowUpDownIcon,
  CircleDotIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * Amenity icon keys (the Site's Amenity Presentation icon, else the Feed's)
 * mapped onto lucide icons. Unknown keys get a neutral check.
 */
const icons: Record<string, LucideIcon> = {
  "hot-tub": BathIcon,
  hottub: BathIcon,
  jacuzzi: BathIcon,
  sauna: HeaterIcon,
  pool: WavesLadderIcon,
  "private-pool": WavesLadderIcon,
  "community-pool": WavesLadderIcon,
  bbq: BeefIcon,
  grill: BeefIcon,
  "fire-pit": FlameIcon,
  fireplace: FlameIcon,
  flame: FlameIcon,
  deck: FenceIcon,
  patio: FenceIcon,
  "ocean-view": SailboatIcon,
  waves: WavesIcon,
  "mountain-view": MountainSnowIcon,
  "lake-view": SailboatIcon,
  beachfront: TreePalmIcon,
  "beach-access": UmbrellaIcon,
  beach: UmbrellaIcon,
  ski: CableCarIcon,
  "ski-in-ski-out": CableCarIcon,
  "walk-to-town": FootprintsIcon,
  wifi: WifiIcon,
  "air-conditioning": AirVentIcon,
  ac: SnowflakeIcon,
  heating: HeaterIcon,
  "game-room": Gamepad2Icon,
  "pool-table": CircleDotIcon,
  "home-theater": TvIcon,
  tv: TvIcon,
  "full-kitchen": CookingPotIcon,
  kitchen: CookingPotIcon,
  "washer-dryer": WashingMachineIcon,
  laundry: WashingMachineIcon,
  elevator: ArrowUpDownIcon,
  "wheelchair-accessible": AccessibilityIcon,
  accessible: AccessibilityIcon,
  garage: CarFrontIcon,
  parking: CarFrontIcon,
  "ev-charger": EvChargerIcon,
  "pet-friendly": PawPrintIcon,
  pets: PawPrintIcon,
  crib: BabyIcon,
  outdoor: SunIcon,
  forest: TreePineIcon,
}

export function amenityIcon(key: string | null): LucideIcon {
  if (!key) return CircleCheckIcon
  const normalized = key
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
  return icons[normalized] ?? CircleCheckIcon
}

export function AmenityIcon({
  icon,
  className,
}: {
  icon: string | null
  className?: string
}) {
  // A lookup of static icon components, not one created during render.
  return createElement(amenityIcon(icon), {
    "aria-hidden": true,
    className: cn("size-5 shrink-0", className),
  })
}

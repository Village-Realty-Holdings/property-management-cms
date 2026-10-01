import type { BlockOf } from "../types"
import { sampleMedia } from "./media"

/**
 * A Location with every field filled: a map image as well as the address,
 * so either map shows it fully.
 */
export const locationSample: BlockOf<"location"> = {
  blockType: "location",
  heading: "Find us by the harbour",
  address: "12 Harbour Road\nSeaside Bay\nCA 90000",
  text: "Two streets from the beach, with free parking and a short walk to the harbour cafes.",
  map: "card",
  mapImage: sampleMedia(5, "map.svg", "A map of Seaside Bay and the harbour"),
  background: "default",
}

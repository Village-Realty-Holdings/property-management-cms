import type { FeedAmenity, FeedPropertyType, FeedVocabularies } from "../feed"

const amenity = (feedId: string, name: string, group: string): FeedAmenity => ({
  feedId,
  name,
  group,
  icon: feedId,
  status: "active",
})

/** The demo Awayday-wide Amenity vocabulary (ADR-0013). */
export const demoAmenities: FeedAmenity[] = [
  amenity("hot-tub", "Hot tub", "Outdoor"),
  amenity("pool", "Private pool", "Outdoor"),
  amenity("community-pool", "Community pool", "Outdoor"),
  amenity("bbq", "Grill", "Outdoor"),
  amenity("fire-pit", "Fire pit", "Outdoor"),
  amenity("deck", "Deck or patio", "Outdoor"),
  amenity("ocean-view", "Ocean view", "Views"),
  amenity("mountain-view", "Mountain view", "Views"),
  amenity("lake-view", "Lake view", "Views"),
  amenity("beachfront", "Beachfront", "Location"),
  amenity("beach-access", "Beach access", "Location"),
  amenity("ski-in-ski-out", "Ski-in/ski-out", "Location"),
  amenity("walk-to-town", "Walk to town", "Location"),
  amenity("wifi", "Wi-Fi", "Essentials"),
  amenity("air-conditioning", "Air conditioning", "Essentials"),
  amenity("fireplace", "Fireplace", "Indoor"),
  amenity("game-room", "Game room", "Entertainment"),
  amenity("pool-table", "Pool table", "Entertainment"),
  amenity("home-theater", "Home theater", "Entertainment"),
  amenity("full-kitchen", "Full kitchen", "Kitchen & Laundry"),
  amenity("washer-dryer", "Washer & dryer", "Kitchen & Laundry"),
  amenity("elevator", "Elevator", "Accessibility"),
  amenity("wheelchair-accessible", "Wheelchair accessible", "Accessibility"),
  amenity("garage", "Garage", "Parking"),
  amenity("ev-charger", "EV charger", "Parking"),
  amenity("pet-friendly", "Pet friendly", "Policies"),
  amenity("crib", "Crib", "Family"),
]

/** The demo Awayday-wide Property Type vocabulary (ADR-0013). */
export const demoPropertyTypes: FeedPropertyType[] = [
  { feedId: "cabin", name: "Cabin", status: "active" },
  { feedId: "condo", name: "Condo", status: "active" },
  { feedId: "house", name: "House", status: "active" },
  { feedId: "townhouse", name: "Townhouse", status: "active" },
  { feedId: "chalet", name: "Chalet", status: "active" },
  { feedId: "studio", name: "Studio", status: "active" },
]

export function demoVocabularies(): FeedVocabularies {
  return {
    amenities: structuredClone(demoAmenities),
    propertyTypes: structuredClone(demoPropertyTypes),
  }
}

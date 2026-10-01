import { buildAccount, type AccountSpec, type ListingRow } from "./build"

/**
 * Feed account "demo-mountain": a Smoky Mountains rental company.
 * Smoky Mountains (region) → Gatlinburg, Pigeon Forge (cities) → Chalet
 * Village, Summit Ridge Resort (resorts). 20 listings: 41018 is inactive,
 * 41019 and 41020 can't be booked online.
 */

const CABIN_BASICS = ["wifi", "full-kitchen", "washer-dryer", "bbq", "deck"]

// prettier-ignore
const listings: ListingRow[] = [
  { feedId: "41001", name: "Bear Hollow Lodge", node: "N111", type: "cabin", bedrooms: 3, bathrooms: 2, sleeps: 8, street: "12", amenities: ["hot-tub", "fireplace", "game-room", "mountain-view", "pet-friendly", ...CABIN_BASICS] },
  { feedId: "41002", name: "Smoky Sunrise Chalet", node: "N111", type: "chalet", bedrooms: 2, bathrooms: 2, sleeps: 6, street: "27", amenities: ["hot-tub", "mountain-view", "fireplace", "wifi", "deck", "full-kitchen"] },
  { feedId: "41003", name: "Whispering Pines", node: "N110", type: "cabin", bedrooms: 4, bathrooms: 3.5, sleeps: 12, street: "418 Ski Mountain Rd", amenities: ["hot-tub", "pool-table", "game-room", "fire-pit", "garage", "pet-friendly", ...CABIN_BASICS] },
  { feedId: "41004", name: "Laurel Creek Retreat", node: "N110", type: "house", bedrooms: 5, bathrooms: 4.5, sleeps: 14, street: "1020 Laurel Creek Way", amenities: ["community-pool", "hot-tub", "home-theater", "game-room", "ev-charger", "garage", "air-conditioning", ...CABIN_BASICS] },
  { feedId: "41005", name: "Downtown Gatlinburg Loft", node: "N110", type: "condo", bedrooms: 1, bathrooms: 1, sleeps: 4, street: "633 Parkway, Apt 3B", amenities: ["walk-to-town", "elevator", "wifi", "air-conditioning", "full-kitchen", "wheelchair-accessible"] },
  { feedId: "41006", name: "Ridgetop Hideaway", node: "N111", type: "cabin", bedrooms: 2, bathrooms: 2.5, sleeps: 6, street: "44", amenities: ["hot-tub", "mountain-view", "fire-pit", "pet-friendly", ...CABIN_BASICS] },
  { feedId: "41007", name: "Mountain Laurel Studio", node: "N110", type: "studio", bedrooms: 0, bathrooms: 1, sleeps: 2, street: "210 Cherokee Orchard Rd", amenities: ["walk-to-town", "wifi", "air-conditioning"], noTimes: true },
  { feedId: "41008", name: "Eagle's Nest Chalet", node: "N111", type: "chalet", bedrooms: 3, bathrooms: 3, sleeps: 10, street: "58", amenities: ["hot-tub", "mountain-view", "fireplace", "pool-table", "crib", ...CABIN_BASICS] },
  { feedId: "41009", name: "Firefly Ridge", node: "N120", type: "cabin", bedrooms: 2, bathrooms: 2, sleeps: 6, street: "1735 Firefly Ridge Ln", amenities: ["hot-tub", "fire-pit", "pet-friendly", ...CABIN_BASICS] },
  { feedId: "41010", name: "Dollywood Getaway", node: "N120", type: "house", bedrooms: 4, bathrooms: 3, sleeps: 12, street: "2890 Veterans Blvd", amenities: ["pool", "game-room", "home-theater", "air-conditioning", "crib", ...CABIN_BASICS] },
  { feedId: "41011", name: "Summit Ridge 101", node: "N121", type: "condo", bedrooms: 2, bathrooms: 2, sleeps: 6, street: "101", amenities: ["community-pool", "elevator", "wifi", "full-kitchen", "washer-dryer", "mountain-view"], noTimes: true },
  { feedId: "41012", name: "Summit Ridge 204", node: "N121", type: "condo", bedrooms: 3, bathrooms: 2, sleeps: 8, street: "204", amenities: ["community-pool", "elevator", "wifi", "full-kitchen", "washer-dryer", "mountain-view", "fireplace"] },
  { feedId: "41013", name: "Summit Ridge 310", node: "N121", type: "condo", bedrooms: 1, bathrooms: 1.5, sleeps: 4, street: "310", amenities: ["community-pool", "elevator", "wifi", "full-kitchen", "wheelchair-accessible"] },
  { feedId: "41014", name: "Pigeon Forge Townhome", node: "N120", type: "townhouse", bedrooms: 3, bathrooms: 2.5, sleeps: 8, street: "156 Teaster Ln", amenities: ["community-pool", "walk-to-town", "air-conditioning", "garage", ...CABIN_BASICS] },
  { feedId: "41015", name: "Creekside Cottage", node: "N120", type: "cabin", bedrooms: 1, bathrooms: 1, sleeps: 4, street: "3312 Little Cove Rd", amenities: ["fireplace", "fire-pit", "pet-friendly", "wifi", "deck"] },
  { feedId: "41016", name: "Bluff View Lodge", node: "N100", type: "house", bedrooms: 6, bathrooms: 5.5, sleeps: 18, street: "900 Bluff Mountain Rd, Sevierville", amenities: ["hot-tub", "pool", "game-room", "home-theater", "mountain-view", "ev-charger", "garage", "elevator", ...CABIN_BASICS] },
  { feedId: "41017", name: "Hemlock Hills", node: "N110", type: "cabin", bedrooms: 3, bathrooms: 2, sleeps: 9, street: "77 Hemlock Hills Dr", amenities: ["hot-tub", "fireplace", "mountain-view", ...CABIN_BASICS] },
  { feedId: "41018", name: "Timber Tops", node: "N111", type: "chalet", bedrooms: 4, bathrooms: 4, sleeps: 12, street: "81", amenities: ["hot-tub", "game-room", "mountain-view", ...CABIN_BASICS], inactive: true },
  { feedId: "41019", name: "Old Mill Townhouse", node: "N120", type: "townhouse", bedrooms: 2, bathrooms: 2.5, sleeps: 6, street: "175 Old Mill Ave", amenities: ["walk-to-town", "wifi", "air-conditioning", "full-kitchen"], offline: true },
  { feedId: "41020", name: "Starry Night Cabin", node: "N120", type: "cabin", bedrooms: 2, bathrooms: 1, sleeps: 5, street: "2604 Starry Night Way", amenities: ["hot-tub", "fire-pit", "pet-friendly", ...CABIN_BASICS], offline: true },
]

export const demoMountainSpec: AccountSpec = {
  region: "TN",
  nodes: [
    {
      feedId: "N100",
      name: "Smoky Mountains",
      type: "region",
      parentFeedId: null,
      status: "active",
      city: "Sevierville",
      postalCode: "37862",
      center: { lat: 35.8681, lng: -83.5618 },
    },
    {
      feedId: "N110",
      name: "Gatlinburg",
      type: "city",
      parentFeedId: "N100",
      status: "active",
      city: "Gatlinburg",
      postalCode: "37738",
      center: { lat: 35.7143, lng: -83.5102 },
    },
    {
      feedId: "N120",
      name: "Pigeon Forge",
      type: "city",
      parentFeedId: "N100",
      status: "active",
      city: "Pigeon Forge",
      postalCode: "37863",
      center: { lat: 35.7884, lng: -83.5543 },
    },
    {
      feedId: "N111",
      name: "Chalet Village",
      type: "resort",
      parentFeedId: "N110",
      status: "active",
      city: "Gatlinburg",
      postalCode: "37738",
      center: { lat: 35.7021, lng: -83.5329 },
      street: "1250 Chalet Village Blvd",
    },
    {
      feedId: "N121",
      name: "Summit Ridge Resort",
      type: "resort",
      parentFeedId: "N120",
      status: "active",
      city: "Pigeon Forge",
      postalCode: "37863",
      center: { lat: 35.8012, lng: -83.5731 },
      street: "3050 Summit Ridge Pkwy",
    },
  ],
  listings,
  stayPolicy: {
    checkIn: "16:00",
    checkOut: "10:00",
    houseRules:
      "No smoking. No parties or events. Quiet hours 10pm–8am. Four-wheel drive recommended in winter.",
    cancellationPolicy:
      "Full refund up to 30 days before arrival, less a $75 processing fee. 50% refund 14–29 days before arrival. No refund within 14 days.",
    minimumAge: 25,
  },
  areaBlurb:
    "Great Smoky Mountains National Park, Dollywood and the Gatlinburg Parkway are all a short drive away.",
  promos: [
    {
      feedId: "P-WINTER26",
      name: "Winter Escape",
      code: "WINTER26",
      status: "active",
      validFrom: "2026-11-01",
      validTo: "2027-03-15",
      discountSummary: "20% off rent on stays of 3 nights or more",
      terms:
        "Arrivals Sunday–Thursday. Excludes Christmas and New Year's weeks.",
      listingFeedIds: ["41001", "41002", "41006", "41008", "41017", "41018"],
    },
    {
      feedId: "P-STAY4",
      name: "Fourth Night Free",
      code: "STAY4",
      status: "active",
      validFrom: "2026-01-01",
      validTo: null,
      discountSummary: "Stay 4 nights, pay for 3",
      terms:
        "The lowest-priced night is free. Cannot be combined with other offers.",
      listingFeedIds: ["41011", "41012", "41013", "41014", "41009"],
    },
    {
      feedId: "P-FALL25",
      name: "Fall Colors 2025",
      code: "FALL25",
      status: "active",
      validFrom: "2025-09-01",
      validTo: "2025-11-30",
      discountSummary: "15% off midweek stays",
      terms: "Monday–Thursday nights only.",
      listingFeedIds: ["41003", "41004", "41010"],
    },
  ],
  reviewPool: {
    great: [
      {
        title: "Perfect mountain getaway",
        body: "The views from the deck were unreal and the hot tub was spotless. Check-in was easy and the cabin had everything we needed.",
      },
      {
        title: "We'll be back every year",
        body: "Our third stay and it just keeps getting better. The kids loved the game room and we loved the quiet mornings.",
      },
      {
        title: "Better than the photos",
        body: "Clean, cozy and so well stocked. Close enough to town but it felt like we were miles away from everything.",
      },
    ],
    good: [
      {
        title: "Great stay, steep driveway",
        body: "Lovely place with a great layout. The driveway is steep, so take it slow, but it was worth it for the view.",
      },
      {
        title: "Comfortable and convenient",
        body: "Beds were comfortable and the kitchen had everything. The Wi-Fi was a little slow in the evenings.",
      },
    ],
    mixed: [
      {
        title: "Nice cabin, a few issues",
        body: "The location is great but the hot tub was lukewarm the first night and one of the bedrooms was chilly.",
        response:
          "Thank you for letting us know. Our maintenance team has serviced the hot tub and the heating, and we'd love to host you again.",
      },
      {
        title: "Okay for the price",
        body: "The cabin was fine but needs some updating. The kitchen was missing a few basics.",
        response:
          "We appreciate the feedback. We've restocked the kitchen and the cabin is scheduled for updates this winter.",
      },
    ],
  },
}

export const demoMountain = () => buildAccount(demoMountainSpec)

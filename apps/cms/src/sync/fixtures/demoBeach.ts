import { buildAccount, type AccountSpec, type ListingRow } from "./build"

/**
 * Feed account "demo-beach": an Emerald Coast rental company.
 * Emerald Coast (region) → Destin, Miramar Beach, Santa Rosa Beach (towns);
 * Emerald Shores Resort sits in Destin and Seascape Towers in Miramar Beach.
 * 20 listings: 52019 is inactive, 52004 and 52015 can't be booked online.
 */

const CONDO_BASICS = [
  "wifi",
  "air-conditioning",
  "full-kitchen",
  "washer-dryer",
  "elevator",
]
const HOME_BASICS = [
  "wifi",
  "air-conditioning",
  "full-kitchen",
  "washer-dryer",
  "bbq",
  "deck",
]

// prettier-ignore
const listings: ListingRow[] = [
  { feedId: "52001", name: "Emerald Shores 1402", node: "B211", type: "condo", bedrooms: 2, bathrooms: 2, sleeps: 6, street: "1402", amenities: ["beachfront", "ocean-view", "community-pool", ...CONDO_BASICS] },
  { feedId: "52002", name: "Emerald Shores 905", node: "B211", type: "condo", bedrooms: 3, bathrooms: 3, sleeps: 10, street: "905", amenities: ["beachfront", "ocean-view", "community-pool", "crib", ...CONDO_BASICS] },
  { feedId: "52003", name: "Emerald Shores 1107", node: "B211", type: "condo", bedrooms: 1, bathrooms: 1.5, sleeps: 4, street: "1107", amenities: ["beachfront", "ocean-view", "community-pool", "wheelchair-accessible", ...CONDO_BASICS], noTimes: true },
  { feedId: "52004", name: "Emerald Shores Penthouse", node: "B211", type: "condo", bedrooms: 4, bathrooms: 4.5, sleeps: 12, street: "PH-2", amenities: ["beachfront", "ocean-view", "community-pool", "hot-tub", "home-theater", ...CONDO_BASICS], offline: true },
  { feedId: "52005", name: "Seascape Towers 3-501", node: "B221", type: "condo", bedrooms: 2, bathrooms: 2, sleeps: 6, street: "3-501", amenities: ["beach-access", "ocean-view", "community-pool", ...CONDO_BASICS] },
  { feedId: "52006", name: "Seascape Towers 1-208", node: "B221", type: "condo", bedrooms: 1, bathrooms: 1, sleeps: 4, street: "1-208", amenities: ["beach-access", "community-pool", ...CONDO_BASICS] },
  { feedId: "52007", name: "Seascape Towers 2-712", node: "B221", type: "condo", bedrooms: 3, bathrooms: 2, sleeps: 8, street: "2-712", amenities: ["beach-access", "ocean-view", "community-pool", "crib", ...CONDO_BASICS], noTimes: true },
  { feedId: "52008", name: "Sandpiper Cottage", node: "B210", type: "house", bedrooms: 3, bathrooms: 2, sleeps: 8, street: "142 Sandpiper Cove", amenities: ["pool", "beach-access", "pet-friendly", "garage", ...HOME_BASICS] },
  { feedId: "52009", name: "Harbor Lights", node: "B210", type: "townhouse", bedrooms: 3, bathrooms: 3.5, sleeps: 9, street: "509 Harbor Blvd", amenities: ["community-pool", "walk-to-town", "garage", ...HOME_BASICS] },
  { feedId: "52010", name: "Gulf Breeze Villa", node: "B210", type: "house", bedrooms: 5, bathrooms: 5, sleeps: 16, street: "4020 Scenic Hwy 98", amenities: ["pool", "beachfront", "ocean-view", "game-room", "pool-table", "ev-charger", "elevator", "garage", ...HOME_BASICS] },
  { feedId: "52011", name: "Crab Trap Studio", node: "B210", type: "studio", bedrooms: 0, bathrooms: 1, sleeps: 3, street: "32 Crab Trap Ln", amenities: ["beach-access", "walk-to-town", "wifi", "air-conditioning"] },
  { feedId: "52012", name: "Miramar Sands", node: "B220", type: "house", bedrooms: 4, bathrooms: 3.5, sleeps: 12, street: "85 Miramar Sands Dr", amenities: ["pool", "beach-access", "game-room", "pet-friendly", ...HOME_BASICS] },
  { feedId: "52013", name: "Salt Air Townhome", node: "B220", type: "townhouse", bedrooms: 2, bathrooms: 2.5, sleeps: 6, street: "217 Salt Air Ct", amenities: ["community-pool", "beach-access", ...HOME_BASICS] },
  { feedId: "52014", name: "Dune Allen Beach House", node: "B230", type: "house", bedrooms: 4, bathrooms: 4, sleeps: 11, street: "5300 W County Hwy 30A", amenities: ["beachfront", "ocean-view", "hot-tub", "fire-pit", "pet-friendly", ...HOME_BASICS] },
  { feedId: "52015", name: "Seagrove Hideaway", node: "B230", type: "cabin", bedrooms: 2, bathrooms: 1, sleeps: 5, street: "68 Seagrove Village Dr", amenities: ["beach-access", "fire-pit", ...HOME_BASICS], offline: true },
  { feedId: "52016", name: "Grayton Getaway", node: "B230", type: "house", bedrooms: 3, bathrooms: 3, sleeps: 8, street: "29 Hotz Ave", amenities: ["community-pool", "walk-to-town", "ev-charger", ...HOME_BASICS] },
  { feedId: "52017", name: "Blue Mountain Beach Bungalow", node: "B230", type: "house", bedrooms: 2, bathrooms: 2, sleeps: 6, street: "12 Blue Mountain Rd", amenities: ["beach-access", "lake-view", "pet-friendly", ...HOME_BASICS] },
  { feedId: "52018", name: "WaterColor Walk", node: "B230", type: "townhouse", bedrooms: 3, bathrooms: 2.5, sleeps: 8, street: "44 Cerulean Park Ln", amenities: ["community-pool", "walk-to-town", "lake-view", ...HOME_BASICS] },
  { feedId: "52019", name: "Rosemary Retreat", node: "B230", type: "house", bedrooms: 5, bathrooms: 4.5, sleeps: 14, street: "7 Kingston Rd", amenities: ["pool", "walk-to-town", "garage", ...HOME_BASICS], inactive: true },
  { feedId: "52020", name: "Seaside Studio", node: "B230", type: "studio", bedrooms: 0, bathrooms: 1, sleeps: 2, street: "15 Central Sq", amenities: ["walk-to-town", "beach-access", "wifi", "air-conditioning"] },
]

export const demoBeachSpec: AccountSpec = {
  region: "FL",
  nodes: [
    {
      feedId: "B200",
      name: "Emerald Coast",
      type: "region",
      parentFeedId: null,
      status: "active",
      city: "Destin",
      postalCode: "32541",
      center: { lat: 30.3935, lng: -86.4958 },
    },
    {
      feedId: "B210",
      name: "Destin",
      type: "town",
      parentFeedId: "B200",
      status: "active",
      city: "Destin",
      postalCode: "32541",
      center: { lat: 30.3935, lng: -86.4958 },
    },
    {
      feedId: "B220",
      name: "Miramar Beach",
      type: "town",
      parentFeedId: "B200",
      status: "active",
      city: "Miramar Beach",
      postalCode: "32550",
      center: { lat: 30.3777, lng: -86.3585 },
    },
    {
      feedId: "B230",
      name: "Santa Rosa Beach",
      type: "town",
      parentFeedId: "B200",
      status: "active",
      city: "Santa Rosa Beach",
      postalCode: "32459",
      center: { lat: 30.3276, lng: -86.2291 },
    },
    {
      feedId: "B211",
      name: "Emerald Shores Resort",
      type: "resort",
      parentFeedId: "B210",
      status: "active",
      city: "Destin",
      postalCode: "32541",
      center: { lat: 30.3818, lng: -86.4406 },
      street: "1100 Scenic Gulf Dr",
    },
    {
      feedId: "B221",
      name: "Seascape Towers",
      type: "condo complex",
      parentFeedId: "B220",
      status: "active",
      city: "Miramar Beach",
      postalCode: "32550",
      center: { lat: 30.3789, lng: -86.3702 },
      street: "112 Seascape Dr",
    },
  ],
  listings,
  stayPolicy: {
    checkIn: "16:00",
    checkOut: "10:00",
    houseRules:
      "No smoking. No parties or events. Rinse sand off at the outdoor shower. Beach gear must stay off the balconies.",
    cancellationPolicy:
      "Full refund up to 60 days before arrival. 50% refund 30–59 days before arrival. No refund within 30 days. Travel insurance recommended during hurricane season.",
    minimumAge: 25,
  },
  areaBlurb:
    "Sugar-white sand, emerald water and the restaurants of Destin Harbor and Scenic Highway 30A are close by.",
  promos: [
    {
      feedId: "P-SPRINGBREAK27",
      name: "Early Spring Break",
      code: "SPRING27",
      status: "active",
      validFrom: "2027-02-15",
      validTo: "2027-04-30",
      discountSummary: "10% off 5+ night stays",
      terms: "Book by January 31. Standard cleaning fees apply.",
      listingFeedIds: ["52001", "52002", "52003", "52005", "52006", "52007"],
    },
    {
      feedId: "P-FALLGULF",
      name: "Fall on the Gulf",
      code: "FALLGULF",
      status: "active",
      validFrom: "2026-09-01",
      validTo: "2026-12-15",
      discountSummary: "Save $50 per night",
      terms: "Minimum 3 nights. Not valid on Thanksgiving week.",
      listingFeedIds: ["52008", "52010", "52012", "52014", "52016", "52017"],
    },
    {
      feedId: "P-SUMMER25",
      name: "Summer 2025 Last Minute",
      code: "LASTMIN25",
      status: "active",
      validFrom: "2025-06-01",
      validTo: "2025-08-31",
      discountSummary: "15% off arrivals within 7 days",
      terms: "Arrival within 7 days of booking.",
      listingFeedIds: ["52009", "52013", "52018"],
    },
  ],
  reviewPool: {
    great: [
      {
        title: "Best beach vacation ever",
        body: "Waking up to the Gulf every morning was magical. The condo was spotless and the beach chairs were a great touch.",
      },
      {
        title: "Steps from the sand",
        body: "Location could not be better. We walked to the beach, the pool and dinner every day and never needed the car.",
      },
      {
        title: "Already booked next summer",
        body: "Beautifully decorated, great beds and a kitchen that actually had everything. The check-in instructions were clear.",
      },
    ],
    good: [
      {
        title: "Lovely stay",
        body: "Great unit and a beautiful view. Parking was a little tight but the staff were very helpful.",
      },
      {
        title: "Great for families",
        body: "Plenty of room for the kids and the pool was a hit. The elevator was slow on Saturdays.",
      },
    ],
    mixed: [
      {
        title: "Good location, needs attention",
        body: "The view was amazing, but the AC struggled on hot afternoons and the balcony door stuck.",
        response:
          "Thank you for the feedback. We've replaced the AC unit and repaired the balcony door since your stay.",
      },
      {
        title: "Not quite as pictured",
        body: "The furniture is more worn than the photos show, and we found sand in the closets at check-in.",
        response:
          "We're sorry about the cleanliness at check-in. We've addressed it with our housekeeping team and are refreshing the furniture this fall.",
      },
    ],
  },
}

export const demoBeach = () => buildAccount(demoBeachSpec)

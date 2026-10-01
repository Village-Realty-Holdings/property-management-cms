# Amenities and Property Types are an Awayday-wide vocabulary, the one thing shared across Sites

Each PMS has its own amenity and dwelling-type vocabulary. The Property Feed maps them onto one Awayday-wide list of Amenities and one of Property Types. The CMS mirrors these lists as read-only reference data that isn't scoped to a Site. Each Site keeps its own Amenity Presentation (filters, groups, labels, icons, order) and Property Type labels. This is a deliberate exception to ADR-0010's "nothing shared between Sites": the vocabularies are reference data, not a Client's content, and sharing them keeps Curated List rules, filters and search consistent across PMSs.

## Considered Options

- **Per-Site mapping in the CMS** (each Site's Admin maps raw PMS amenities onto a Site list). Rejected. Mapping is repeated work for every Client on the same PMS, and it belongs with the PMS knowledge in the Feed.
- **Raw PMS values.** Rejected. Legacy did this and needed a merge table (`wp_pm_search_amenities`) to make filters work across PMSs.

## Consequences

- Adding an Amenity or Property Type is a Feed change, not a CMS edit.
- Access rules treat these collections as readable by every Site and writable only by the Sync.

# Locations mirror the Property Feed's node tree, and Complex is a Location Level

Each Site's Location tree is mirrored from the Property Feed's nodes (Track nodes, Streamline resort areas). A Property belongs to the Location its Feed Listing names. An Admin gives each Location a Location Level (Destination, Area or Complex), a display name and guest visibility. Complexes get extra editorial fields (address, shared amenities, check-in, housekeeping, fee notes). This follows the legacy plugin (`wp_pm_nodes` with an admin-set `search_level`), which already models Complex as a node, but it makes Complex pages data-driven. In the legacy plugin they were hand-built Elementor pages.

## Considered Options

- **Complex as a separate entity.** Rejected. The PMS already models complexes as nodes. A separate entity would need the Sync to decide which nodes are Complexes, which is an editorial call the Level already makes.
- **A CMS-owned tree with Sync mapping** (the earlier "Location Mapping" idea). Rejected. It duplicates a tree the PMS already maintains, and it drifts when the PMS changes.

## Consequences

- A Location's Level is editorial and independent of the PMS's own node type, because PMS node types are inconsistent across Clients.
- Withdrawing Locations follows the same rule as Properties: a node missing from the Feed is hidden, not deleted.

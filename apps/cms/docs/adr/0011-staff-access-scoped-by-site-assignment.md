# Only Awayday staff log in, and access is scoped by Site Assignment

Only Awayday Staff Users log into the CMS. Clients, owners and guests never do. Each Staff User has a role (Admin or Editor) and a Site Assignment. Both roles see and change only documents on their assigned Sites. Admins additionally manage Site Settings, Locations and Staff Users for those Sites. A separate Super Admin flag lifts the Site Assignment limit, for creating Sites and running the platform. This supersedes ADR-0004.

## Considered Options

- **Client logins.** Rejected. Clients send change requests and Awayday staff make the edits, which keeps the access model internal.
- **Admins see every Site.** Rejected. Staff are assigned to Client accounts, so an Admin on one Client shouldn't see another Client's content by default.
- **A role per Site Assignment** (Admin on one Site, Editor on another). Rejected for now as unnecessary. It could be added later by moving the role onto the assignment.

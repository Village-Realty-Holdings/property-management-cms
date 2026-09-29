# Form Submissions are stored in the CMS, then forwarded

Inquiries, Owner Leads and contact forms are saved as Submissions against their Site, then forwarded to that Site's Forwarding Destination (the PMS CRM through the Feed, a CRM webhook, or email). Storing first gives an audit trail, and a retry source when a destination is down. The legacy plugin forwarded to Track CRM, GoHighLevel, SendInBlue or Omnisend and lost the entry whenever that call failed.

## Consequences

- This is the only place the CMS holds guest personal data (ADR-0001 otherwise keeps Guests out). Submissions need a retention period and a delete-on-request path, and access is limited to staff of that Site.
- Forwarding runs asynchronously after the Submission is stored. A failed forward is visible and retryable in the admin, and never loses the Submission.

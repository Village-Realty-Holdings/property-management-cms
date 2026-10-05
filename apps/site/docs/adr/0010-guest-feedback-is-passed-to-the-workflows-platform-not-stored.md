# Guest feedback is passed to the Workflows platform, not stored or mailed by the Site

The Guest feedback survey Block asks a guest for a rating out of five stars. A high rating is asked for a public review at a link the Block holds. A lower one gets a feedback form, and that feedback has to reach the guest care team. The Site does not send email and does not keep the feedback. Its server posts each submission as JSON to the Awayday Workflows platform (`POST <WORKFLOWS_URL>/api/run/<GUEST_FEEDBACK_WORKFLOW>`, by default the workflow `guest-feedback-survey`), which queues a run and sends the email over its own SMTP connection. The Site treats a 2xx answer as sent and anything else as not sent, and the Block then shows its Sent or its Not sent step.

The browser never learns where the platform is. The Block's form posts to the Site's own route (`/api/guest-feedback`), which checks every answer again, drops a submission that fills a hidden trap field, adds the Site's name and origin, and forwards it. Nothing is written to the Site's database.

## What the workflow receives

`rating` (1 to 5), `message`, and when given `name`, `email`, `phone`, `reservation`, `property`, `checkIn` (YYYY-MM-DD); `consent` (true only when the guest ticked the box); `page` (the path the survey is on); `site` (the Brand's name) and `siteUrl`.

## Considered Options

- **Send email from the Site.** Rejected. The Site has no mail transport, and the Workflows platform exists to own SMTP credentials, retries and a log of what ran.
- **Store feedback in a collection and list it in the Admin.** Rejected for now. It makes the Site a system of record for guests' contact details, with retention and access rules to match, and nobody asked for an inbox. It can be added beside the forwarding later.
- **Post from the browser straight to the platform.** Rejected. It would publish the platform's address, need CORS there, and skip the Site's checks.
- **One Block per step.** Rejected. The steps depend on each other, so separate Blocks would let Users build a survey with no form, or two.

## Consequences

- Until `WORKFLOWS_URL` is set and the workflow exists, a guest who sends feedback is told it could not be sent. The review path does not depend on it.
- The route is open to visitors. It is protected by size limits, the answer checks and the trap field, not by a rate limit: that belongs at the edge, or in the platform.
- A run that is queued and later fails inside the platform is the platform's to report; the guest has already been thanked.
- The Workflows platform's run endpoint showed no authentication when this was written. If it gains a key, the Site sends it from the server's environment and nothing else here changes.

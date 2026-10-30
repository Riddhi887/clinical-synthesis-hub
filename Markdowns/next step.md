# Next Step

## Add Production Persistence

Before production deployment, replace the prototype storage with persistent backend services:

- Add PostgreSQL or Supabase for users, patient cases, case folders, documents, summaries, reports, and metadata.
- Add object storage such as Supabase Storage or S3 for uploaded PDFs and images.
- Add authenticated backend APIs for creating, reading, updating, and deleting case folders.
- Replace browser `localStorage` as the source of truth with server-side persistence.
- Keep the Docker records volume only as a local-development fallback.
- Add database migrations, backups, access control, audit logging, and clinical-data security controls.

## Add Case-Aware Priority Processing

Keep processing sequential and isolated by patient case:

- A failed document retry remains in its original patient case and never creates a new case.
- New documents added through an existing Patient Case folder remain in that same case.
- If another case is processing, let the current document finish before switching cases.
- Prioritize retries and new documents for an incomplete case before normal queued cases.
- Rebuild a case summary only after all required documents for that case succeed.
- If documents are added after a summary or report exists, mark the existing outputs outdated and regenerate them from the complete case record set.
- Resume the paused case queue after the priority case update is complete.
- Show case ID, document ID, queue priority, and per-case progress in the processing UI and backend logs.
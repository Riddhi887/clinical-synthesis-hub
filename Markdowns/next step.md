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

### Case Identity and Intake

- [x] Preserve the existing `caseId` when retrying a failed document from Patient Cases.
- [x] Preserve the existing `caseId` when adding files through an existing Patient Case folder.
- [x] Create a new `caseId` only for genuinely new patient cases.
- [x] Prevent retries and case updates from appearing as new patient folders.
- [x] Keep each document linked to both its `caseId` and stable `documentId`.

### Queue and Scheduling

- [x] Keep processing sequential: only one document may run at a time.
- [x] Allow the document already in progress to finish before changing cases.
- [x] Add a queue job type for failed-document retries.
- [x] Add a queue job type for new documents added to an existing case.
- [x] Assign priority jobs to the incomplete case they belong to.
- [x] Process priority retries and case updates before ordinary queued cases.
- [x] Preserve the order of files within each case where practical.
- [x] Resume the paused ordinary queue after all priority work for the case is complete.
- [x] Continue processing other queued cases when one document fails.
- [x] Avoid duplicate queue jobs for the same `caseId` and `documentId`.

### Processing State and Failure Handling

- [x] Keep retry failures attached to the original case.
- [x] Keep per-document status values for queued, processing, completed, and failed.
- [x] Track retry count and the latest failure message without discarding the document.
- [x] Reset only the failed document for retry; preserve successful documents in the case.
- [x] Keep global processing progress available when navigating between workflow steps.
- [x] Include `caseId`, `documentId`, job type, priority, stage, and progress in backend logs.

### Summary and Report Invalidation

- [x] Detect when a document is added to a case that already has a synthesis.
- [x] Mark the existing synthesis as outdated before processing the new document.
- [x] Detect when a document is added to a case that already has a report.
- [x] Mark the existing report as outdated before processing the new document.
- [x] Prevent a stale synthesis or report from being presented as current.
- [x] Rebuild the case synthesis only after all required case documents complete successfully.
- [x] Require report regeneration from the complete case record set after a case update.
- [x] Preserve existing saved reports while clearly identifying them as outdated.

### User Interface

- [x] Show the case name or `caseId` for every queue item.
- [x] Show the document name and stable `documentId` for every queue item.
- [x] Label jobs as `Retry`, `Update`, or `Queued`.
- [x] Show per-case progress separately from overall queue progress.
- [x] Show the active document and current processing stage.
- [x] Show clear retry failure details and the retry action in the original case.
- [x] Show when a synthesis or report is outdated and why.
- [x] Disable synthesis/report actions until the case is complete and current.

### Verification and Acceptance Criteria

- [x] Start Case A and queue Case B; confirm the active Case A document finishes before any switch.
- [x] Fail a Case A document, retry it, and confirm no new case is created.
- [x] Add a new file to completed Case A and confirm it remains in Case A.
- [x] Confirm the Case A update is processed before ordinary Case B work.
- [x] Confirm Case B resumes after Case A priority work completes.
- [x] Confirm a failed Case A retry does not remove previously successful Case A documents.
- [x] Confirm synthesis is stale immediately after a case update.
- [x] Confirm the report is stale immediately after a case update.
- [x] Confirm synthesis rebuilds only after all Case A documents succeed.
- [x] Confirm report generation uses the complete updated Case A record set.
- [x] Confirm refresh/navigation preserves queue state and progress.
- [x] Run frontend build, backend syntax validation, and focused browser queue/state acceptance tests.

Browser acceptance run completed on 03 Nov 2026 using the regional sample case plus controlled valid and invalid uploads. The run also covered navigation during processing, persisted queue recovery, explicit retries, stale-output gating, and folder synchronization.
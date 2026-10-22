# Roadmap

- [ ] Dashboard: derive all KPIs and 4 charts from persisted session state (no hardcoded series)
- [ ] Charts: intake trend (line, per-day from real uploads), document type distribution (bar), intake processed vs reports generated (comparison bar), processing status donut (complete/in-progress/queued)
- [ ] Background sync at 5s with no full-tree re-renders/layout flicker (isolate clock, remove sync-state churn)
- [ ] Sidebar: smooth expand/collapse toggle, persisted across reload
- [ ] Session storage: documents, summaries, reports persist and dashboard reads historical + current data
- [ ] Background processing queue: uploads while a batch runs go to an isolated queue; sequential auto-processing after the batch finishes
- [ ] Verify: typecheck, Playwright flow (upload mid-run → queued → auto-processed), persistence after reload

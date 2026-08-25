---
name: portal-tab-sync-audit
description: Audit whether portal counters/badges/notifications stay in sync across browser tabs (BroadcastChannel coordinator), and check for accidental duplicate Odoo requests. Use when adding a new counter/badge to the client or staff portal, when a user reports "it shows different things in my two tabs", or when asked to verify/extend cross-tab sync.
---

# Portal cross-tab sync audit

Syntia's client portal keeps notification/counter state in sync across browser
tabs via a specific, narrow mechanism. This skill tells you how to check
whether a given piece of UI state participates in that mechanism, how to
extend it correctly, and how to avoid adding Odoo load while doing so.

## The mechanism (read this before touching anything)

- `src/modules/portal/infrastructure/portal-notifications-tab-coordinator.ts`
  — `PortalNotificationsTabCoordinator`. Wraps a `BroadcastChannel`
  (`syntia-portal-notifications`) plus a `localStorage`-based leader election
  (`syntia-notifications-leader`, heartbeat every 10s, stale after 25s). Only
  the **leader tab** actually polls Odoo (`checkPortalNotificationsAction`,
  every 30s–5min, backing off on no-change). Non-leader tabs either ask the
  leader to poll now (`requestPollFromLeader`) or just receive results.
  Message types: `poll-result`, `state-sync`, `record-mutated`,
  `request-poll`, `leader-claim`, `leader-resign`.
- `src/modules/portal/ui/portal-notifications-context.tsx` —
  `PortalNotificationsProvider` (aliased as `ChatterNotificationsProvider` in
  `chatter-notifications-context.tsx` — same provider, same hooks, don't
  treat them as two systems). Owns the coordinator and exposes via
  `usePortalNotificationsOptional()`:
  - `unread` — the notification list (badges, bell, list-row icons).
  - `stats` — `PortalNotificationsStats` (client home counters:
    `activeTramitesAndConsultas`, `obligacionesInProgress`,
    `pendingSignatures`, `nextObligacion`).
  - `readState`, `pendingFirmaIds` — supporting state for the above.
  - `notifyRecordMutated(scope, recordId)` — call this after a tab performs
    its OWN mutation (upload, post a message) so sibling tabs refresh too.
    Poll-detected changes (something changed in Odoo, done by someone else)
    already propagate via `poll-result`; **self-mutations do not**, because
    the acting tab's own ack/watch-state update can suppress the next poll
    from flagging it as "new" for that same user. This is the #1 thing
    people forget to wire up.
- **Mounted only for `role === 'client'`**:
  `src/modules/portal/ui/portal-shell.tsx` →
  `<ChatterNotificationsProvider enabled={user.role === 'client'}>`. Staff
  roles (`admin`, `advisor`) get `enabled={false}` — the coordinator never
  starts, so **nothing on staff dashboards is cross-tab synced today**. This
  was a deliberate scope decision (staff polling would add new Odoo load),
  not an oversight — see "Known gaps" below before assuming it should be
  auto-fixed.
- Chatter read-state (`syntia-chatter-read-state` in `localStorage`) has a
  *second*, independent cross-tab path: the native `storage` event fires
  automatically across tabs for `localStorage` writes. Don't reinvent this
  for similar "last seen" state — reuse the same pattern if applicable.

## Classification (apply to every counter/badge you touch or add)

- **(a) Cross-tab synced** — reads from `usePortalNotificationsOptional()`
  context state (not just calls its ack/write methods), OR has its own
  explicit cross-tab mechanism (`BroadcastChannel`, `storage` listener,
  WebSocket/SSE — none of the latter exist elsewhere in this repo today).
- **(b) Per-tab only** — has its own live update (polling, fetch-on-focus,
  local `useState`/module-level cache) but no cross-tab propagation. Two
  tabs can disagree until each independently refreshes.
- **(c) SSR/static only** — set once at render, no live update at all in the
  tab. Needs a manual reload/navigation.

(b) and (c) are not automatically bugs — plenty of state is fine staying
per-tab. Flag it as a gap only when a user would plausibly notice
"my two tabs disagree" for something that represents shared, externally-
mutable state (an Odoo record's count, a notification).

## Audit procedure

1. **Find the candidate state.** Grep for the counter/badge's data source:
   is it a prop threaded from a Server Component (`page.tsx` /
   `async function` component), or does the client component call
   `usePortalNotificationsOptional()` / `useChatterNotificationsOptional()`?
2. **If it reads from context** → classify (a). Double check it reads
   `unread`/`stats`/etc., not just calls `ackDocumentsSeen`/
   `ackStatusChangeSeen`/`markConversationSeen` (those only *write* —
   they mark something seen, they don't pull in cross-tab updates).
3. **If it doesn't read from context**, grep the component for:
   - `setInterval`, `useSWR`/`swr`, `EventSource`, `WebSocket` → own
     mechanism; check if it's cross-tab (BroadcastChannel/storage) or just
     per-tab (fetch-on-mount/focus). As of this audit, the only other
     polling-like thing in the repo is `use-advisor-presence.ts`
     (fetch-on-mount + fetch-on-visibilitychange, **per-tab only**, class b).
   - A module-level cache (`const xClientCache = new Map(...)`) → per-tab
     only by construction (separate JS module instance per tab). Example:
     `record-attachments-panel.tsx`'s `attachmentsClientCache` (30s TTL,
     class b — confirmed still per-tab as of this audit).
   - Nothing at all → class (c).
4. **When a counter should move from (b)/(c) to (a):**
   - If the underlying data is already fetched during the existing poll
     (tramites/obligaciones/firmas snapshots), extend `PortalNotificationsStats`
     or the poll payload and read it from context — **zero extra Odoo
     requests**, this is always the cheapest fix.
   - If it's driven by a self-mutation (the tab's own upload/post/edit),
     call `notifyRecordMutated(scope, recordId)` after the mutation succeeds
     so siblings call `refreshPortalPages()` — also zero extra Odoo requests
     beyond what each affected tab's own `router.refresh()` already costs.
   - If it requires genuinely NEW polling for a role/surface that doesn't
     poll today (most notably: any staff-side counter) — **this adds real
     Odoo load and is a scope/cost decision, not a pure bug fix.** Surface
     it to the user before implementing; don't silently turn on polling for
     staff. See project memory on Odoo request-cost sensitivity.
5. **Manual verification:** open the portal in two tabs (same login), and
   for the state you changed: perform the mutating action in tab A, confirm
   tab B updates within one poll interval (or immediately, if wired via
   `notifyRecordMutated`) without tab B needing a manual reload.

## Known gaps as of the last audit (2026-08-12) — re-verify, don't assume

Re-check these still apply before reporting them as current; code moves fast.

- **Staff dashboards (admin/advisor) are fully class (c).** No polling, no
  provider (`enabled={false}`). `AdminHome`/`AdvisorHome`/
  `solicitudes-page-view.tsx` (onboarding "solicitudes" list) show no live
  updates across tabs or staff members. Fixing this means adding new polling
  for staff — a real Odoo-cost decision, ask before building.
- **Open chat/attachments drawers don't live-append.** `RecordChatterPanel`
  only *writes* to the notifications context (acks); it never *subscribes*,
  so a poll-detected new message doesn't append into an already-open drawer
  in any tab — the badge can clear while the drawer content stays stale
  until closed/reopened. `RecordAttachmentsPanel` is better: it *does* react
  to `knownAttachmentCount` prop changes (which do flow from `router.refresh()`),
  so an already-open attachments panel self-corrects once the record's
  attachment count prop changes; the chat message list has no equivalent.
- **Self-mutation broadcast (`notifyRecordMutated`) covers `RecordChatterPanel`
  message posts only** (tramites/consultas chat). Not wired into any
  obligaciones-side mutation path (obligaciones has no chat panel today) or
  any other self-mutation surface that might be added later — check new
  mutation call sites for whether they should call it too.

## Related context

- Odoo request-cost sensitivity is a hard project constraint (see memory:
  `feedback_odoo_request_cost`) — every fix in this skill should be checked
  against "does this add a new Odoo call, or just propagate data we already
  fetched." Prefer the latter; treat the former as a decision to surface,
  not to make unilaterally.

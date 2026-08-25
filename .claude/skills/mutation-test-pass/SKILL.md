---
name: mutation-test-pass
description: Write and mutation-verify Vitest tests for a file, module, or block of code — used after finishing a dev task, or when explicitly asked to test something rigorously ("test agresivo", "no complaciente", "mutation test X"). Confirms tests actually catch breakage instead of just being green. Use whenever a change touches Supabase queries, auth/session logic, or any security- or correctness-sensitive branch, and no adequate test exists yet.
---

# Mutation-verified test pass

Green tests prove nothing by themselves — they only prove the code ran
without throwing. This skill is the procedure for writing tests that are
demonstrably not complacent: for every security- or correctness-relevant
branch, the test must be shown to fail when that branch is broken.

This methodology was established during the `feature/colaboradores`
Supabase-wide test sweep (see project memory: `project_supabase_test_sweep`)
after the user pushed back twice on green-test theater — first asking
"como es posible que este todo verde? tan bien lo hiciste? seguro que no
son complacientes?", then explicitly demanding "todos esos test han
sufrido mutacion de codigo para ver si realmente recogen bien la
funcionalidad?". See also `feedback_test_first_pessimistic_workflow`: the
standing rule to suggest this after finishing dev work, and to suspect the
code — not the test — on a failure.

## When to reach for this

- Right after finishing a feature/bugfix, as the "should we test this"
  step — especially for anything touching Supabase, auth/session state,
  access control, or money/tax calculations.
- When the user explicitly asks for rigorous/aggressive/non-complacent
  testing, or asks whether tests were mutation-verified.
- When a file has zero or thin test coverage and you're about to trust its
  behavior for something risky.

Not every file needs this depth. A pure UI component with no branching
logic, or a thin wrapper with no independent behavior, doesn't need
per-branch mutation testing — say so and move on rather than manufacturing
mutations for their own sake.

## Test-writing conventions (this repo, Vitest)

- Test files are colocated: `<source>.test.ts` next to the source file.
- Run with `npx vitest run <path>` (full suite: `npx vitest run`).
- For Supabase repository files: mock the admin client via
  `vi.hoisted()` + `vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({ createSupabaseAdminClient }))`.
- Use a small chainable-query-builder mock (`chainFor(result)`) whose
  methods (`select`, `eq`, `is`, `in`, `order`, `limit`, `insert`,
  `update`, `delete`, `maybeSingle`, `single`, and a bare `.then()` for
  code that awaits the builder directly) all return `this` except the
  terminal methods, which resolve the configured `{ data, error }`.
- **`beforeEach(() => vi.resetAllMocks())`, never `vi.clearAllMocks()`** —
  `clearAllMocks` does NOT clear a mock's `mockReturnValueOnce` /
  `mockResolvedValueOnce` queue, so state leaks between tests that need
  one mocked client to return different answers across sequential calls.
- When a function reuses ONE client instance across multiple `.from()`
  calls (revoke-then-insert, read-then-write), the mock must be a single
  client whose `.from()` is queued with `mockReturnValueOnce` per call, in
  the real call order — not one fresh client per query. Getting this wrong
  produces confusing "wrong data shape" failures; if a test fails with an
  unrelated-looking error, check this first.
- Assert the actual filter/scope calls (`expect(chain.eq).toHaveBeenCalledWith(...)`),
  not just the returned shape — a scoping bug (wrong column, missing
  `.eq()`) won't show up in a shape-only assertion.
- Cover every exported function's branches: early-return guards (empty
  input, not-found), error propagation, and any place two similar-looking
  code paths have a **deliberately different** semantic (e.g. one function
  always clears then conditionally re-adds; a sibling function only clears
  under a narrower condition) — lock down the *difference*, not just each
  path in isolation.

## Mutation-testing procedure

For each branch worth verifying (see "What to prioritize" below):

1. `cp <source-file> <scratchpad>/<name>.ts.bak` — back it up to the
   session scratchpad, not via git (keeps git status clean mid-flight).
2. Make ONE targeted edit that breaks the specific behavior — invert a
   condition, delete a guard clause, hardcode a return value, remove one
   `.eq()`/`.is()` filter call. Keep it surgical: one mutation at a time,
   so a failure is attributable.
3. Run the test file. Confirm **the specific test(s) you expected** go
   red — not just "something failed." If an unexpected test fails, that's
   information (maybe two tests were relying on the same behavior without
   you realizing) — note it, don't just shrug and restore.
4. If nothing fails: the test suite has a real gap. Write the missing
   assertion now, then re-run the mutation to confirm it's caught.
5. Restore: `cp <scratchpad>/<name>.ts.bak <source-file>`.
6. After all mutations for this file are done: run the full suite
   (`npx vitest run`), `npx tsc --noEmit -p .`, and `npx eslint <files>`,
   then `git diff --stat <source-file>` to confirm the restore left zero
   diff — only genuine, intentional changes (if any) should remain.

## What to prioritize (don't mutate every line — budget is finite)

In priority order:
1. Authorization/access-control checks (role gates, ownership checks,
   token validity windows, single-use enforcement).
2. Guards that prevent a write from happening under the wrong condition
   (early returns on empty/invalid input, conditional inserts/deletes).
3. Semantic differences between two similar-looking functions (see above).
4. Dedup/precedence logic (first-wins vs last-wins, is this intentional).
5. Error propagation (does a DB error actually surface as a thrown error,
   not get swallowed).
6. Pure data mapping (camelCase↔snake_case, row→domain-type) — worth one
   mutation per file to confirm the test isn't just checking shape/count,
   but doesn't need per-field coverage unless a field has been wrong
   before.

Cosmetic/display-only branches (label text, sort order tie-breaks with no
correctness implication) generally don't need mutation coverage — note
that you skipped them rather than silently leaving a gap unmentioned.

## If a test fails and it's NOT your mutation

This is the other trigger for this skill: a pre-existing or newly-written
test starts failing after an unrelated code change. Per
`feedback_test_first_pessimistic_workflow`: **read the actual current
behavior of the code first.** Do not edit the test's expected value until
you've confirmed the code's current behavior is the *intended* one. If the
code is wrong, fix the code. Only adapt the test once you can articulate
why the new expected behavior is correct — write that reasoning into the
test itself if it's non-obvious (a comment, or the test's own name).

## Closing out

- Update the relevant project memory (or create one) with: what was
  tested, what was found (bugs fixed, or "no bugs found, guards confirmed
  correct"), and the mutation-coverage summary — don't just say "N tests
  added," say what they proved.
- If a real bug is found: fix it directly unless it's a genuine
  design/cost tradeoff the user should weigh in on (e.g. adding a new
  external API call, changing a public-facing behavior) — in that case,
  flag it clearly and ask, don't fix unilaterally. See
  `feedback_odoo_request_cost` for the shape of that kind of tradeoff in
  this repo.
- Suggest running the full suite one more time as a final sanity check
  before considering the task done.

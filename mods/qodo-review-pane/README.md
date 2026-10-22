# Qodo Review Pane v0.2.2

Unofficial Claude Code mod, not built or supported by Qodo. Manual Qodo review, readable finding details and a user-sent fix request. No automatic edits, commits, pushes, dismissals or PR writes.

## Install

```sh
claude plugin marketplace add gvago/qodo-claude-mod
claude plugin install qodo-review-pane@qodo-unofficial
```

Open a Claude Code session (CLI, or a **local Code session** in Claude Desktop) in your repository and enter `/qodo-pane`. Existing sessions may need `/reload-plugins`. Chat, Cowork and cloud sessions are not supported.

For development, load the source directly: `claude --plugin-dir /absolute/path/to/mods/qodo-review-pane`. Installed copies are cached by version, so source edits need a version bump and a plugin update.

## Use

The pane leads with the review: a one-line instruction, a `Select` navigator carrying every finding on one row, then the selected finding in a bordered card (title, level, new or carried over, file:line, description as Markdown) and **Ask Claude to fix this finding** as the primary action, with the suggested fix under it. Evidence, **New review of this checkout** (intent and target ref) and **Operation details** are collapsed sections below; the submit form opens itself while there is no result to read, and an uncollected operation puts Collect review at the top instead. The pane opens on the most urgent newly reported finding (action required, then remediation recommended, then informational); an explicit pick survives redraws, and only a new result re-ranks. Carried-over findings say so and ask to be reassessed; the pane never dismisses, hides or marks one fixed.

Change intent is prepared for you. Opening the pane distils a **Review context** from the goals stated most recently in this session, the matching branch's pull request (read-only `gh pr view`), the commit subjects and the scoped diff — every changed file is named, untracked files included, with a per-file share of the hunk budget so a broad change is never described by whichever files came first. The panel keeps **Stated goal** apart from **Inferred purpose**, and labels a change summary as such when nobody stated a goal. Edit it freely: the first keystroke locks the field and nothing regenerates over it. A value installed by preparation is drawn at a fresh address so a field already on screen cannot keep the empty text it was mounted with; your own typing never changes the address, so nothing remounts under you. There is no confirmation step; Review changes submits what the field holds.

While it runs, **Preparing review context…** sits directly under the pane's status, outside every collapsible section, so it stays visible when a result has folded the setup away; a failure is announced in the same place. Synthesis uses the host's own gateway model (`haiku`, low effort) through `$.model.complete` — no provider, account or credential configuration is read or changed. Generated context is always synthesised. No conversation turn stands in for the review's scope, however tidy it reads: the review covers the whole working tree, and the newest turn is usually a refinement of something much larger. The diff decides both the scope and what else is relevant — a turn, pull request or commit counts only where the diff bears it out, recency on its own counts for nothing, and a later turn that corrects an earlier one wins. Transport wrappers such as pasted-content tags are stripped before anything is read, keeping their contents. The model is told to write purpose and behaviour in its own words, in complete sentences, with no approval language, agent instructions or checklists. The diff it sees is labelled a bounded excerpt of a real working tree, and it is told that code it cannot see is not missing: it describes what the change does, never how finished it is, and never calls it a scaffold, stub, skeleton, prototype, placeholder, boilerplate, partial or incomplete. A question must name the stated purpose it contradicts, quoting words from the model's own STATED line; one that quotes nothing — about unseen code, suspected mismatched material, or how finished the work is — is dropped. That is a structural check, not a list of forbidden words. Results are cached by rule-set version, checkout, base and tree — the version leads the key, so context generated under older preparation rules is never reused — so reopening the pane or reading an old result costs nothing; a changed scope prepares once more. A generation that outlives its scope is discarded: it must still own the preparation slot and match the checkout, session, target ref and tree it started from, and nothing is shown or installed until that holds. Progress, readiness and failure are announced through the status line as well as drawn. If preparation fails, the pane says so and manual entry still works — it never touches the review gate.

Everything gathered is treated as untrusted source data to be summarised, never as instructions: it is fenced in the prompt and the system message says so. Every string that reaches the model — diff hunks, new files, pull request title and body, commit subjects — passes through one redaction choke point, so no source can be added that quietly skips it. It replaces assignment-shaped credential lines (quoted or bare) and netrc records with a marker, keeping the surrounding content; paths that imply a credential (.env, .netrc, .git-credentials, keys, npmrc) are named but never opened. A conversation turn containing a credential is dropped whole. **Only the distilled summary is sent to Qodo** — never the conversation, the pull request text or the gathered diff.

Fill or adjust Change intent inside the pane, keep or change Target ref, activate Review changes. Qodo submits the working tree plus intent to the existing configured deployment. Closing the pane does not cancel the accepted operation. Collect review recovers the same operation rather than submitting again. Results expire server-side about one hour after completion. A review accepted before a reload keeps being collected automatically. If Qodo no longer knows the operation (`no such review`), the pane says it expired, closes it and re-enables Review changes; other collection errors keep the operation for recovery.

Ask Claude to fix drafts only one finding; you explicitly send it. The prompt box receives one plain line (`Fix Qodo finding <id>: <title> (<file>:<line>)`); the full instructions and finding data are attached as hidden context only when you send that line yourself, once. Raw finding text never enters the composer, so URLs and `@`-shaped strings in code snippets cannot be mistaken for mentions. If the code changed between drafting and sending, the attached context says so. Existing prompt drafts are preserved. Evidence renders explanation and source citations; suggested fix renders its description, not transport JSON or embedded server instructions.

## Lifecycle

Each review owns its checkout, submitted intent/base/snapshot, operation, collection lock and timer. New submissions remain locked until collection finishes. A checkout/session reset clears findings and invalidates old callbacks. Accepted operations are retained even when storage or later bookkeeping fails. Successful stored operation handles restore on startup, with manual collection required. Failed collection announces the error and retains the operation for recovery.

If recovery state cannot be read at startup, `/qodo-pane` still registers; new review submissions are blocked, but coding and collection remain available. A failed pre-submission recovery write prevents invocation. The pending record receives the returned operation ID before acceptance is saved, and is deleted only after that save succeeds. Startup reads both records: unresolved pending takes precedence over an older saved review; it is reconciled only when operation ID, base and snapshot match.

Displayed results turn **Stale** when the working tree no longer matches the reviewed snapshot: checked when the pane opens and after each Bash, Edit, Write or NotebookEdit call. Edits made outside Claude are caught on the next open, not live. Stale results stay visible for reference and cannot be sent as fix requests.

Pane submissions and Claude-launched submissions share one admission gate. A Claude `qodo review --async` call takes the gate before its first await and fingerprints the tree before the call runs, so Review changes pressed during that preflight finds the gate held and later edits cannot pass as reviewed; a preflight that refuses restores the previous review untouched. While a review is active, a second supported submission is denied before Bash runs it, so no duplicate review is paid for; the pane says which operation to collect or recover. Unsupported commands are never denied. The operation ID the accepted call prints is bound to that submission and collected with `qodo review status`, never a new submission. No previous pane review is required — a fresh session adopts the first supported Claude review. Intent is the `summary` the context file actually sent.

Adoption needs one unambiguous simple command: `qodo review --base <ref> --async --json --context-file <file>`, optionally behind a single `cd <dir> &&` whose real path is this checkout, with no pathspecs. The base must resolve in this checkout. Because the Bash event carries the command text and not the directory it ran in, anything that makes the directory or the command/output pairing unknowable is refused rather than guessed at: a second command, `&&`/`;`/`|`, command substitution, redirection, backticks, subshells. Pathspec runs, sync runs, status reads and IDs captured without being printed are ignored silently. If an accepted submission's output carries no operation ID, or more than one, the pane adopts neither and shows the IDs so the handles are not lost.

Findings are labelled `new` (reported by this call) or `still open` (carried from an earlier review), with Qodo's `attribution_status` shown as reported. The summary says "no new findings" separately from the still-open count. The pane never dismisses or marks findings implemented.

Admission is either proven not to have happened or treated as unknown. A call the host refuses never ran, so the gate opens again; a call that throws after it may have reached Qodo leaves the gate shut, because the pane cannot tell a failed spawn from a review already billing. An outstanding admission is written to the plugin store before the command runs and restored on the next session, so a reset cannot lose it and cannot let a duplicate through; it is cleared only when an operation is adopted or when you unlock it. Unlocking takes two deliberate presses and says plainly that a review may be running and billing, and that submitting another would pay for a second one. Nothing is ever collected or cancelled on your behalf.

Admission uncertainty never automatically resubmits. Recover CLI admission first when no operation was returned. If storage fails and the process exits, retain the displayed operation ID yourself; no storage system can restore an unwritten handle.

## Requirements and data

Claude Code 2.1.287+ with mods enabled; Desktop local Code supports mod panes. Existing Qodo CLI 1.4.0-compatible async review/auth and entitlement; Git with remote comparison base; absolute TMPDIR. Review-context preparation uses the host's gateway model and, when present, a read-only `gh pr view`; both degrade silently and neither is required. No credential reads or dependencies installed by the mod.
Qodo owns diff gathering/filtering/authentication. Secret filtering is not DLP. Local Git hashes detect working-tree drift; raw untracked content is not stored by the mod. Temporary intent file is cleaned after submission. Plugin store retains operation/result per checkout; no additional telemetry or HTTP client.

## Review-context evaluation

Stubbed tests prove routing, never summary quality. `node tests/eval/run.mjs` runs the real gateway model over `tests/eval/cases.json` — the prompt is read out of `hooks/register.js` so the evaluation cannot drift from the code — and saves every input and output to `tests/eval/results.json`. It is run by hand and is not one of the gates.

Six cases: a broad change followed by a narrow request, a narrow scope inside a broad session, unrelated recent conversation, an explicit goal correction, an empty session with pull-request evidence only, and two independent changes under one narrow stated goal.

Last run, all six were acceptable. The earlier run of the same cases was not: two summaries judged how finished the code was, one lost the stated goal entirely, and four of six raised a question — only one of which was real. What remains unproven: one run per case on one model, and the first case's excerpt is the opening of a single file, so its observed-changes line reflects that slice rather than the whole change.

## Verification

```sh
claude plugin validate /absolute/path/to/qodo-review-pane --strict --json
claude plugin test /absolute/path/to/qodo-review-pane
node --test /absolute/path/to/qodo-review-pane/tests/runtime.test.mjs
tsc -p /absolute/path/to/qodo-review-pane --noEmit
```
`tests/runtime.test.mjs` covers the lifecycle contract with stubbed operations: admission gating and duplicate blocking, suspended-preflight races, recovery after reload, stale marking, checkout changes, context preparation and redaction, and the fix/triage drafting flows. `tests/pane.test.ts` renders the pane on terminal and desktop element surfaces. Stubbed tests prove logic, not a live Qodo review.

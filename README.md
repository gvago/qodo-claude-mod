# Qodo Review Pane for Claude Code (unofficial)

A Claude Code mod that puts [Qodo](https://www.qodo.ai) code review inside your session. Run a review of your working tree, read the findings in a pane, and hand the one you choose back to Claude as a fix request.

> **Unofficial.** A community project by [@gvago](https://github.com/gvago). Not built, endorsed or supported by Qodo.

## What it does

- **`/qodo-pane`** opens a review pane next to your conversation.
- **Review context is written for you.** The pane summarises your session goals, PR, commits and diff into an editable intent before submitting.
- **Findings, sorted by priority.** High, then Medium, then Low; new findings before carried-over ones. Carried-over findings are labelled.
- **Ask Claude to fix this finding** drafts a prompt for one finding. You press Enter. Nothing is edited, committed, dismissed or pushed automatically.
- **Stale-aware.** If the code changes after a review, results are marked stale and fix actions are disabled until you re-review.
- **No duplicate charges.** Pane and Claude-launched `qodo review` runs share one gate, so a second review can't start while one is running.

## Requirements

- Claude Code **2.1.287+** with mods enabled
- [Qodo CLI](https://docs.qodo.ai) installed and authenticated, with access to local review
- A Git repository with a remote comparison base (default `origin/main`)

## Install

```sh
claude plugin marketplace add gvago/qodo-claude-mod
claude plugin install qodo-review-pane@qodo-unofficial
```

Then, in a Claude Code session inside your repo:

```
/qodo-pane
```

Works in the CLI and in Claude Desktop **local Code** sessions.

## Privacy

Only the distilled review context is sent to Qodo, never your conversation. Lines and files that look like credentials are redacted before any model sees them; this is a best-effort filter, not DLP. The mod uses your existing Qodo CLI auth and Claude's own model gateway and reads no credentials of its own.

## Docs

Full behaviour, lifecycle and verification: [mods/qodo-review-pane/README.md](mods/qodo-review-pane/README.md).

## License

Apache-2.0

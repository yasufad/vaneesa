# Vaneesa - Agentic Collaboration Guidelines

This repository is actively developed by autonomous and semi-autonomous AI agents. Since multiple agents may operate concurrently over this codebase in real-time, strict adherence to these structural rules is absolutely mandatory to prevent cross-contamination and maintain production quality.

## 1. Concurrent Awareness & Staging Isolation
You are not the only entity operating in this environment. Another agent may be actively editing a different system at the same time.
*   **Zero Blind Staging:** You must never use `git add .`, `git commit -a`, or broad staging commands. You must precisely stage only the single file you have explicitly modified for your current commit.
*   **Ignore the Noise:** If you detect uncommitted changes or formatting differences in files outside your immediate scope, ignore them entirely. Focus exclusively on your assignment.

## 2. Production-Grade Engineering
Vaneesa is a professional desktop tool. Treat the codebase with the utmost seriousness; it is not a gimmick.
*   **No Naïve Implementations:** As an agent, the cost of generating robust code is cheap. Do not write lazy, "good enough", or partial implementations. Write the complete, edge-case-handled code from the start.
*   **Zero TODOs:** If you uncover an edge case or missing logic, resolve it immediately. Do not leave `// TODO` markers pointing to deferred maintenance unless it is entirely out of scope for the given ticket.
*   **No Sloppiness:** Never write generic, repetitive, or careless code.

## 3. The Commenting Standard
Comments are for context, not translation. The codebase must remain visually clean.
*   **Explain WHY, not WHAT:** The code itself must be readable enough to be self-documenting. Use comments *only* to explain the rationale behind a non-obvious decision or constraint.
*   **Cite Sources:** If you implement a tricky algorithm, network protocol parser, or a specific API behaviour snippet, you must include a URL/link in the comments pointing directly to the official spec/RFC that justifies your approach.
*   **No Flooding:** Do not pollute the codebase with useless descriptive comments over simple functions.

## 4. Build and Testing Cadence
Do not assume your generated code compiles. You must verify it iteratively.

**For Backend Changes (Go):**
*   After making changes to Go files, test build strictly into the bin directory rather than cluttering the root: `go build -o ./bin/vaneesa`

**For Frontend Changes (React/TS):**
*   After a frontend file change, change directory into `frontend/` and run `npx tsc --noEmit` to aggressively check type safety without producing output.
*   After completing a series of small, single-file commits, run `npm run build` from the `frontend/` directory to verify the bundler succeeds.

**Integration Build:**
*   When completing a feature that touches both ends, build the full Wails application into the `./bin` directory to verify the bridge holds up.

## 5. Alignment with Base Guidelines
As an agent, you must fundamentally obey all constraints laid out in `CONTRIBUTING.md`. Specifically:
*   **Single-file per commit:** Grouping multiple files into one commit is forbidden.
*   **Conventional Commits:** Keep commit messages rigidly formatted (`feat:`, `fix:`, etc.).
*   **International English:** Strictly use UK spelling patterns (`behaviour`, `colour`, `analyse`) throughout all code and text, unless an external library or API specifically dictates otherwise.

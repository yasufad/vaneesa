# Contributing to Vaneesa

Thank you for your interest in contributing to Vaneesa. To maintain a clean, perfectly trackable, and highly professional codebase, we enforce exceptionally strict contribution guidelines. Please ensure you understand the following rules before opening a Pull Request.

## 1. The Strict Rule: Single File Per Commit

Vaneesa enforces a microscopic and highly disciplined commit history. **A single commit must never modify more than one file.**

If your feature requires changes to three files, that feature must exist as exactly three individual commits in your pull request.

**Why do we do this?**
*   **Absolute Revertability:** If a change introduces a bug, reverting the exact line of failure is trivial without ripping out unassociated changes in other files.
*   **Decoupled Architecture:** If changing *File A* forces you to immediately change *File B* to prevent the build from breaking, the code is too tightly coupled. This rule acts as a natural pressure mechanism against spaghetti logic.
*   **Surgical History:** Running `git bisect` or `git blame` results in pinpoint accuracy.

*Note: If a refactor temporarily breaks the build (e.g., updating a struct interface in one file, and satisfying it in the next), ensure the final state of the PR passes all CI checks. The strict single-file rule takes precedence.*

## 2. Conventional Commits

Vaneesa strictly follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) standard. 

The format must be: `<type>(<optional scope>): <description>`

### Allowed Types:
*   `feat`: A straightforward new feature or capability.
*   `fix`: A bug fix.
*   `docs`: Documentation updates.
*   `style`: Formatting, missing semi-colons, whitespace (must not affect logic).
*   `refactor`: Code changes that neither fix a bug nor add a feature.
*   `perf`: Performance improvements.
*   `test`: Adding or correcting unit/integration tests.
*   `chore`: Build process, tooling, or dependency updates.

### Examples:
*   `feat(capture): introduce L3 packet decoder`
*   `fix(ui): correct table alignment in dashboard`
*   `docs(readme): correct spelling of behaviour`

*(Remember: Even if you are adding entirely new functionality, each file added or modified gets its own Conventional Commit).*

## 3. International English

All code, documentation, UI text, and comments must use **International English (UK spelling)**.

This applies universally. Treat your code as professional prose.
*   Use `colour`, not `color` (e.g., `--bg-colour-primary` or `setColour()`).
*   Use `behaviour`, not `behavior`.
*   Use `analyse`, not `analyze`.
*   Use `initialise`, not `initialize`.
*   Use `anomalies`, not `anomolies`.

If your IDE auto-inserts American English terminology, you must override it. 

## 4. Development Workflow

1.  **Discuss first:** Open an issue to discuss significant architectural changes before writing code.
2.  **Branch naming:** Use `feature/<name>` or `fix/<name>`.
3.  **No format-all commits:** Never run an automatic formatter (`gofmt`, `prettier`) blindly over the entire repository. This instantly violates the single-file-per-commit rule. Format only the file you are actively working on.
4.  **Testing:** The Go packet processing pipeline must remain strictly detached from Wails to allow pure unit testing. If you modify `parser.go`, your next commit should be modifying `parser_test.go` to prove it works.

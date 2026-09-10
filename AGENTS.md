# AGENTS.md

Instructions for AI coding agents working in this repository. See [CONTRIBUTING.md](CONTRIBUTING.md) for project scope, repository map, and change-review expectations — read that first for context. This file covers coding style rules agents must follow when writing or editing code here.

## Coding guidelines

1. **Use OOP design patterns.** Model new behavior as classes with clear responsibilities rather than loose function collections or ad hoc state bags. Favor encapsulation (private fields/methods, constructor-injected dependencies), composition over inheritance, and named design patterns (factory, strategy, adapter, registry) where they fit the problem. `src/hosts/` (`HostAdapter`, `HostRegistry`, and one class per host) is the reference example — new adapters, engines, or services should follow that shape: one class per concern, a registry/factory for instantiation, interfaces for extension points.
2. **Always utilize installed packages.** Before writing new utility code, check `package.json` for a dependency that already solves the problem (e.g. `zod` for runtime validation, `unified`/`remark-*` for markdown/AST work, `yaml` for YAML). Do not hand-roll parsing, validation, or traversal logic that an installed package already provides. If a new capability genuinely requires a new dependency, prefer adding one over reimplementing it, and say so explicitly rather than silently vendoring a subset of a library.
3. **Follow TypeScript standards.**
   - Respect the project's `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, and `verbatimModuleSyntax` are all on — write code that satisfies them without `any`, non-null assertions, or type-suppression comments as a shortcut.
   - Runtime-validate external/model input (per CONTRIBUTING.md item 3) — TypeScript types alone are not enough at trust boundaries.
   - Use `interface`/`type` for extension points that OOP classes implement, explicit access modifiers (`private`/`readonly`) over convention-based privacy, and `override` on overriding methods (enforced by `noImplicitOverride`).
   - Keep modules ESM-consistent (`type: "module"`, `NodeNext` resolution) — explicit file extensions in relative imports, no CommonJS interop shortcuts.

These rules apply on top of, not instead of, the project-specific expectations in CONTRIBUTING.md (immutability and fail-closed behavior in kernel/session code, replay-semantics sync, asset-prose placement, etc.).

## Reading the user's prompting style

The user often phrases requests with "or" chaining several candidate words/terms (e.g. "call it a validator or checker or gate"). This is not a request to support multiple options — it means they aren't sure which term is correct and are thinking out loud while searching for the right one. Treat it as a single point of uncertainty, not a list of alternatives to implement or preserve:

- Pick the term that best fits the existing codebase vocabulary and conventions, and use only that one consistently.
- Don't create synonyms, aliases, or support for multiple names "just in case."
- If the choice is genuinely ambiguous or consequential (e.g. a public API name), surface the ambiguity back to the user briefly rather than guessing silently.

Similarly, the user will sometimes list several comma-separated examples and trail off with "etc." (e.g. "something like a wrapper, adapter, shim, etc."). This is also thinking-out-loud, not a request to enumerate or support every item listed. Don't treat the list as literal requirements to cover exhaustively — infer the underlying category/pattern the examples are gesturing at, and design for that concept rather than for each named item.

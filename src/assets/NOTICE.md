# Asset Origin

These JSON files are copied, versioned assets — not runtime imports from another
repository. They are the ground-truth algebra specification for this engine.

| File | Source (absolute path at time of copy) |
|---|---|
| `formalism.json` | `/Users/flyingcoder/ai-labs/recursive-ai-framework/recursive-extraction-engine/compiler/formalism.json` |
| `commutator_skeleton.json` | `/Users/flyingcoder/ai-labs/recursive-ai-framework/recursive-extraction-engine/compiler/commutator_skeleton.json` |

Copied: 2026-08-20. Source formalism version: `2.0.0` (see `formalism.json` → `metadata.version`).

If the source formalism changes, re-copy deliberately and re-run the kernel test
suite — do not silently drift. `commutator_skeleton_enhanced.json` (same source
directory) exists but is not used: the ported `dissipation_calculator.py`
behavior this engine matches only ever loads the plain `commutator_skeleton.json`
(sign → magnitude 1.0/0.0), so that is what `legalNext`/`lambda` parity is
tested against.

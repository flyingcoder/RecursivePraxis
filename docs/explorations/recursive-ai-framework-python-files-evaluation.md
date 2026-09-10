~/ai-labs/recursive-ai-framework

Recursive AI Framework Wiring
Twenty-three Python files, and almost none of them import each other. The real dependency graph is written on disk in JSON — six scripts handing artifacts forward through a shared output directory, with a compiler subsystem that never touches any of it.

23
.py files
5,201
lines
13
internal imports
38
json read/write edges
0
__init__.py
The JSON spine
Running setup.py executes six scripts in order by subprocess. None of them import one another — each reads the previous one's JSON off disk and writes its own. That makes the file system the call graph.

524 *.md files
1
pattern_extract.py
pattern_extraction.json
24 MB · read by 4 stages
2
build_operator_mapping
5
build_contradiction
_taxonomy
operator_mapping.json
contradiction_taxonomy
TERMINAL PRODUCT
3
refine_commutators.py
refined_commutators.json
4
integrate_magnitudes.py
commutator_skeleton_enhanced
NO RUNTIME CONSUMER
6
build_torsion_field.py
4 INPUTS · NUMPY
torsion_field_analysis.json
TERMINAL PRODUCT
CHECKED-IN SEED DATA
commutator_skeleton
20-OPERATOR ALGEBRA
formalism.json
λ INTRINSICS · v2.0.0
script
json artifact
checked-in seed
dead-end output
writes
also reads
Stage order is setup.py's subprocess order, not a true dependency order. Stage 5 only needs stage 1's output and could run anywhere after it. Stage 6 pulls from stages 1, 2, 3 and a seed file at once. The one genuinely serial run is 1 → 2 → 3 → 4.
Import edges — two islands
All 13 internal import statements live inside recursive-extraction-engine/, and they form two clusters that share a parent directory and nothing else. There is no module path between them.

no import crosses this line
COMPILER/
CORE/ + EXTRACTORS/ + CLI/
test_20_operators.py
controlled_rupture_cli
inverse_solver.py
dissipation_calculator
3 IMPORTERS
phase_portrait.py
3 IMPORTERS
flat sibling imports — resolve only when
compiler/ is cwd or on sys.path
cli/extract.py
operator
_extractor
equation
_extractor
contradiction
_extractor
extractor_base.py
3 IMPORTERS
anthropic SDK
openrouter_client.py
module
external dependency
imports
Both clusters converge on a single leaf. On the left, dissipation_calculator and phase_portrait are imported by everything above them; on the right, every extractor descends from extractor_base. Change either leaf and the whole cluster moves. With no __init__.py anywhere in the repo, both clusters depend on the caller's working directory or an explicit sys.path.insert.
Per-file edges
Every dependency each file actually has, split by kind. Teal marks a write, amber a checked-in seed file, red an artifact nothing consumes.

File	LOC	Imports (internal)	Reads	Writes
Pipeline — root, run in order by setup.py
pattern_extract.py	208	—	524 *.md	pattern_extraction.json
build_operator_mapping.py	228	—	pattern_extraction.json	operator_mapping.json
refine_commutators.py	217	—	operator_mapping.json
pattern_extraction.json
commutator_skeleton.json	refined_commutators.json
integrate_magnitudes.py	166	—	refined_commutators.json
commutator_skeleton.json
formalism.json	commutator_skeleton_enhanced.json
build_contradiction_taxonomy.py	356	—	pattern_extraction.json	contradiction_taxonomy.json
build_torsion_field.py	429	—	pattern_extraction.json
operator_mapping.json
refined_commutators.json
formalism.json	torsion_field_analysis.json
Drivers & verification — root
setup.py	119	—	—	subprocess → the 6 stages
test_everything.py	457	—	all 5 pipeline outputs
formalism.json + both skeletons	subprocess → test_20_operators.py
health_check.py	73	—	pattern_extraction.json
refined_commutators.json
torsion_field_analysis.json	—
test_enhanced_magnitudes.py	194	compiler.dissipation_calculator
via sys.path.insert	commutator_skeleton_enhanced.json
formalism.json	—
analyze_patterns.py	51	—	pattern_extraction.json	stdout only
recursive-extraction-engine/compiler/
dissipation_calculator.py	283	—	formalism.json
commutator_skeleton.json — in an uncalled method	—
phase_portrait.py	360	—	formalism.json	—
inverse_solver.py	418	dissipation_calculator
phase_portrait	formalism.json	—
controlled_rupture_cli.py	295	dissipation_calculator
phase_portrait
inverse_solver	via those three	—
test_20_operators.py	322	all four above	formalism.json
commutator_skeleton.json	—
recursive-extraction-engine/ — core, extractors, cli
core/extractor_base.py	210	— (anthropic)	source files	<name>s.json
<name>_checkpoint.json
core/openrouter_client.py	79	— (requests)	—	—
extractors/operator_extractor.py	121	core.extractor_base	—	via base
extractors/equation_extractor.py	110	core.extractor_base	—	via base
extractors/contradiction_extractor.py	154	core.extractor_base	—	via base
cli/extract.py	157	extractors × 3
core.openrouter_client
via sys.path.insert	a target repo	via base
Standalone
digital_city/prototype.py	194	—	/root/goldmine_export.json	streamlit UI
What the graph exposes
Stage 4 writes into a void
integrate_magnitudes.py carries a sixth of the pipeline's purpose — it merges extraction-derived magnitudes into the operator algebra. Its output, nothing at runtime ever loads. DissipationCalculator.load_commutators_from_skeleton() defaults to the base commutator_skeleton.json, and no caller passes the enhanced path; that method is in fact never called anywhere. The only readers of the enhanced file are two test scripts that open it as raw JSON to assert on its contents.

So the compiler runs on the hand-authored seed algebra, and the evidence-refined one sits beside it unused.

grep commutator_skeleton_enhanced → 6 hits: 1 write (integrate_magnitudes.py:94), 2 print statements, 3 test reads. Zero compiler reads.
grep load_commutators_from_skeleton → 1 hit: its own def at dissipation_calculator.py:42.

Two extraction implementations, one orphaned
The repo extracts operators, equations and contradictions twice over. pattern_extract.py does it with regex and feeds the entire pipeline. The recursive-extraction-engine/ LLM path — base class, three extractors, OpenRouter shim, CLI, checkpointing, thread pool, 831 lines — feeds nothing.

It was clearly meant to be the source: it defaults its output to the same extraction_outputs/ directory the pipeline reads from. But its three output files don't exist on disk, and no script references them by name.

find operators.json equations.json contradictions.json *_checkpoint.json → no results.
extract.py --output-dir default: <repo>/extraction_outputs.

Generated data is committed, source data is not
commutator_skeleton_enhanced.json is produced by stage 4 and also tracked in git — so the repo carries a build product that will silently diverge from its inputs on every re-run. Meanwhile the five real pipeline outputs in extraction_outputs/ are untracked, including the 24 MB pattern_extraction.json that four stages depend on.

A fresh clone therefore has the stale derived file but none of the files the pipeline actually reads, which is why setup.py must run before anything else works.

git ls-files "*.json" → formalism.json, commutator_skeleton.json, commutator_skeleton_enhanced.json, goldmine/goldmine.json. Nothing under extraction_outputs/.

Two paths break outside their home directory
digital_city/prototype.py opens /root/goldmine_export.json — a Linux-box path that will not resolve here — and hardcodes roughly 20 graph relations inline because that JSON's relations array came back empty. Separately, the compiler's flat sibling imports mean its five modules only load with compiler/ on the path; test_everything.py works around this by shelling out with an explicit path rather than importing.

prototype.py:10 · test_everything.py:359 · no __init__.py exists anywhere in the repo.

Relation to the 20 operators
The whole codebase orbits one hand-authored vocabulary: the 20 named operators in formalism.json, five to each of four classes. Every Python file relates to that vocabulary in exactly one of four ways — it defines the operators, discovers them in prose, quantifies how pairs of them interact, or executes sequences of them.

Band	Files	Relation to the 20	Operators touched
DEFINE	formalism.json
commutator_skeleton.json	Declares all 20 by name, class, symbol and λintrinsic, plus the full 20×20 commutator matrix. Hand-authored, not derived — the file calls itself GROUND TRUTH.	20 / 20
the only place all 20 exist
DISCOVER	pattern_extract.py
build_operator_mapping.py
extractors/ × 3	Hunts symbolic glyphs in the corpus — Φ, Ξ, ∂, ∇, ¬ — then translates them into normative names. build_operator_mapping.py is the sole bridge between the two vocabularies.	6 / 20
10 glyphs → Meta, Para, Telo, Pro, Ana, Non
QUANTIFY	refine_commutators.py
integrate_magnitudes.py
build_torsion_field.py	Turns co-occurrence counts into pairwise magnitudes |[Oᵢ,Oⱼ]|, then into the antisymmetric torsion field T = antiSym(∇C). Works on pairs, so it only ever sees operators the DISCOVER band supplied.	7 / 20
16 evidence pairs, 35 torsion pairs
EXECUTE	dissipation_calculator.py
phase_portrait.py
inverse_solver.py
controlled_rupture_cli.py	Reads λ per operator, assigns each a basin among the three attractors, and searches operator sequences that move a state toward a target. Consumes the seed algebra directly, never the extracted evidence.	20 / 20
but grammar constrains only 4
VERIFY	test_20_operators.py
test_everything.py
health_check.py
test_enhanced_magnitudes.py	test_20_operators.py asserts across all 20; the three root checkers assert almost entirely on one result — Meta ∘ Meta = 1.000, the corpus's maximum-torsion pair, used as the system's health sentinel.	20 / 20 in the suite
1 operator in the sentinel
UNRELATED	digital_city/prototype.py
analyze_patterns.py
core/openrouter_client.py	A graph-viz demo over an unrelated goldmine export, an ad-hoc frequency printer, and an HTTP shim. None operate on the vocabulary: analyze_patterns.py prints counts for six names, prototype.py's two are coincidental theme labels, the shim names none.	0 / 20 in substance
A-Constructive
2 / 5 evidenced
Kata
λ 0.35
Telo
λ 0.25
← Ω
Ortho
λ 0.30
Pro
λ 0.50
← φ →
Latch
λ 0.29
B-Disruptive
3 / 5 evidenced
Ana
λ 0.75
← ∂
Para
λ 0.65
← ψ
Non
λ 0.90
← ∇ ¬
Fold
λ 0.70
Flux
λ 0.60
C-Reflexive
2 / 5 evidenced
Meta
λ 0.80
← Ξ Ψ Φ
Retro
λ 0.40
Echo
λ 0.45
Braid
λ 0.55
SECONDARY ONLY
Seed
λ 0.28
D-Structural
0 / 5 evidenced
Crux
λ 0.42
Weave
λ 0.33
Bind
λ 0.38
Axis
λ 0.31
Vale
λ 0.88
NO CORPUS EVIDENCE REACHES THIS ENTIRE CLASS
← marks the corpus glyphs that map onto the operator. λ is the intrinsic dissipation coefficient from formalism.json.
carries corpus evidence — 7
defined only, never extracted — 13
The pipeline sees a third of its own algebra. Every operator has a λ and a full row in the 20×20 commutator matrix, so the compiler can run any of them. But only seven ever acquire a measured magnitude — and they cluster on the disruptive and reflexive axes, exactly where the source corpus does its philosophizing.
Operator reach, file by file
The bands above group the files; this is all 23 .py files in the repo, one row each, none collapsed. Counts are word-boundary matches of the 20 operator names in source text, including string literals and comments — a fair proxy for how much of the algebra a file actually reasons about. Four of the non-zero counts are incidental — names inside LLM prompt strings or unrelated theme labels — and are marked as such.

File	Ops named	Which, and why that many
Operator-complete — 16–20 of 20
phase_portrait.py	20/20	Gives every operator its own transition rule across the three attractors and a basin under V(x) = D(x) + α·C(x). The only file that names all twenty and treats each distinctly.
test_20_operators.py	20/20	The algebra's conformance suite — its name is literal.
build_operator_mapping.py	20/20	Names all twenty as candidate targets in all_normative, then resolves only six. The file where the other fourteen fall out.
dissipation_calculator.py	16/20	Loads all 20 λ intrinsics from formalism.json and computes λ(i→j) for any pair — operator-complete at runtime even though Retro, Pro, Axis, Latch never appear literally in its source.
build_contradiction_taxonomy.py	16/20	Scans the corpus for operator names while classifying contradictions, but bins its output by contradiction category, not by operator. Meta takes 23 of its 60 mentions.
Narrowed to the constrained, the evidenced, or the incidental — 1–7 of 20
controlled_rupture_cli.py	7/20	The four constrained operators plus Kata, Telo, Ortho in worked examples; delegates all real handling to the three modules it imports.
refine_commutators.py	6/20	Meta dominates at 13 of its 20 mentions. Writes all 400 ordered pairs but supplies evidence for only 16, all drawn from the evidenced six.
analyze_patterns.py	6/20	Ad-hoc frequency print over the same six — one mention apiece, no algebra.
extractors/equation_extractor.py	6/20	Not algebra: all six sit inside one prompt line (“Could this map to operators like Ana, Kata, Meta, Telo, Para, Non”) and the worked JSON example beneath it.
test_enhanced_magnitudes.py	5/20	Checks extracted magnitudes against seed predictions across the evidenced subset only. Meta alone accounts for 25 of its 37 mentions.
inverse_solver.py	4/20	Meta, Ana, Para, Non — exactly the four hard constraints at lines 122–143. The other sixteen pass through the search ungoverned.
integrate_magnitudes.py	3/20	Merges the 16 evidenced magnitudes onto the 20×20 skeleton, leaving the seed's signs and resultants intact for the 384 pairs with no evidence.
extractors/contradiction_extractor.py	3/20	Not algebra: Meta ∘ Non ∘ Meta appears twice as illustrative prompt text, once as the example value of operator_pattern.
extractors/operator_extractor.py	2/20	Not algebra: one prompt line, “Meta ∘ Para”, as a composition example. The extractor itself hunts glyphs, never normative names.
digital_city/prototype.py	2/20	Not algebra: its Meta and Non hits are theme labels in a hardcoded graph — coincidental collisions with the vocabulary.
test_everything.py	1/20	Meta only, 18 times: evidence_pairs['Meta,Meta'] and T[Meta,Meta]. A 457-line suite whose operator coverage is one name.
health_check.py	1/20	Same sentinel, 6 mentions, at line 48. One operator pair stands in for the whole system's health.
The algebra never appears — 0 of 20
build_torsion_field.py	0/20	Names no operator in code — it computes over whatever set operator_mapping.json hands it. Operator-agnostic in code, operator-bound through data: its 35-pair field spans seven.
pattern_extract.py	0/20	Works purely in glyphs (φ Φ Ψ Ξ ∂ ∇ ⊗ ∮). It has no concept of the normative twenty — translation happens one stage later.
setup.py	0/20	Subprocess driver. Sequences the six stages by filename; nothing about what they compute.
cli/extract.py	0/20	Argument parsing, repo walking, thread pool, output-dir wiring for the three extractors.
core/extractor_base.py	0/20	File I/O, content hashing, checkpoint resume, Anthropic SDK calls. The shared machinery under all three extractors.
core/openrouter_client.py	0/20	A 79-line HTTP shim. API transport, nothing else.
Fourteen operators are asserted, not measured
The symbolic-to-normative table in build_operator_mapping.py maps 10 corpus glyphs onto just 6 of the 20 operators. The script is candid about it — it computes a variable literally named unused_normative, prints it under “Normative operators not yet mapped”, and follows with a hand-written list of “Suggested additional mappings” (Kata ← Compression/crystallization patterns, and so on). Those suggestions were never implemented.

The consequence runs downstream: refine_commutators.py can only produce evidence for pairs drawn from those 6, so its 16 evidence pairs and the torsion field's 35 pairs are drawn from a 7-operator alphabet. The remaining 13 keep whatever magnitude the hand-authored skeleton gave them, forever.

operator_mapping.json · primary_recommendations → {Ana, Meta, Non, Para, Pro, Telo}
torsion_field_analysis.json · 35 pairs over {Ana, Braid, Meta, Non, Para, Pro, Telo} + “All”, which is not an operator — see below
never present in any generated file: Axis, Bind, Crux, Echo, Flux, Fold, Kata, Latch, Ortho, Retro, Seed, Vale, Weave

The solver's grammar governs 4 operators out of 20
inverse_solver.py searches operator sequences under four hard constraints — max two consecutive Meta, no Non after Meta, no Para after Non, no Ana at sequence end. Those name four operators. The other sixteen can appear anywhere, in any order, any number of times.

So the constraint layer and the evidence layer independently converged on the same small handful — Meta, Ana, Non, Para — while three quarters of the declared algebra carries neither measurement nor rule.

inverse_solver.py:122–143 · four if guards, no others.

One pair carries the whole health check
health_check.py and test_everything.py both treat Meta ∘ Meta = 1.000 as the signal that the system works — the self-reference pair that came back with maximum torsion at 38 occurrences, nearly three times the next-highest pair (Meta ∘ Telo, 13). It is the repo's headline result, and also its entire smoke test.

Because it depends on the extraction outputs rather than the seed algebra, a pipeline that silently produced nothing would fail here loudly, which is useful. But no check covers the other 34 torsion pairs or any of the 13 unevidenced operators.

health_check.py:48–62 · test_everything.py:235–261 · both key on evidence_pairs['Meta,Meta'].

A twenty-first operator, and it isn't one
The torsion field spans eight tokens, not seven. The composition glyph ∘ maps to likely_normative: ["All"] — an annotation meaning this applies to every operator, not the name of one. build_torsion_field.py:74 takes likely_normative[0] literally, so “All” enters the field as a first-class operator across 6 pairs and 306 location observations, outranking Braid.

It then reaches formalism['operators'].get('All', {}) at line 302, misses, and silently falls back to λ = 0.5 — a fabricated dissipation constant that propagates into the J′ estimate of every invariant involving it. Nothing downstream can tell the difference between this and a real measurement.

torsion_field entries · ('All','Meta') 118 locations · ('All','All') 87 · ('All','Pro') 44 · ('All','Non') 25 · ('All','Para') 21 · ('All','Telo') 7 · ('All','Ana') 4.

Stages 3 and 6 read different symbol tables
build_operator_mapping.py publishes two products: the curated primary_recommendations (10 glyphs → 6 operators) and the raw mappings with ranked candidates per glyph. refine_commutators.py reads the curated one. build_torsion_field.py ignores it and re-derives its own axis from mappings[*].likely_normative[0].

The two vocabularies disagree. The curated path yields 6 operators; the raw path yields 8 tokens, picking up Braid (from ⊗) and the bogus All. So the commutator magnitudes and the torsion field describe the same corpus over different operator sets — which is why the 16 evidence pairs and the 35 torsion pairs can never be lined up against each other.

refine_commutators.py:12 reads primary_recommendations · build_torsion_field.py:71–74 iterates mappings and takes likely_normative[0].

Derived from static analysis of all 23 .py files at ~/ai-labs/recursive-ai-framework · 5,201 lines · sources last modified 2026-08-05.
Edges extracted from import statements, open() / json.load / json.dump calls, and subprocess invocations. Declared dependencies: streamlit, networkx, pyvis, matplotlib, pandas, anthropic, numpy — requests is imported by openrouter_client.py but declared in neither requirements file.

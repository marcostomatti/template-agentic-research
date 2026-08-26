/**
 * @packageDocumentation
 * The node types the workflow invariants judge built output
 * against, kept as data so the suite can ask whether every entry
 * was reached rather than only whether the entries it reached
 * passed.
 *
 * A check over built output is a sweep: walk the nodes
 * `workflow-dist.ts` hands back, flag the ones a rule names,
 * report every offender. What decides which nodes are flagged is
 * a node type string, and the rosters here are where those
 * strings live — an entry per type, carrying the string, a stable
 * id, and the reason that type is one the suite names.
 *
 * Data rather than a regex alternation or a predicate written
 * into the sweep, and what the difference buys is a question a
 * case can ask. Entries that can be enumerated can be PAIRED: a
 * case plants one sample per entry, keys each sample to its entry
 * by id, and asserts the two sets are equal. An entry nobody
 * planted a sample for then fails a case of its own, rather than
 * riding along untested behind the entries that were. Spelled as
 * one pattern the sweep compiles, the same suite reads
 * identically green while covering whichever entries the author
 * remembered.
 *
 * Worth asking here because the assertions standing on these
 * rosters are absence checks, and an absence check reports the
 * same nothing for a type no workflow carries as for a matcher
 * that would never have caught it. So the sweep over the real
 * tree cannot tell a live matcher from a dead one, and the
 * roster's own paired samples are the only thing that can. It
 * bites hardest on a roster whose subject is not in the tree at
 * all — the model one, which no built workflow carries a node for
 * yet — where the sweep runs across zero nodes and every claim
 * about it holds by having found nothing.
 *
 * Split from the assertions for the reason `naming-patterns.ts`
 * keeps its scan surface and its needle set apart from the
 * invariant that reads them, and paired with `workflow-dist.ts`:
 * that file is what a check is handed, this one is what the check
 * judges it by. Kept here the rosters stay readable, they sit
 * inside a file `tsc` reads — which a `.test.ts` is not — and a
 * case can assert about a roster directly rather than a suite
 * assuming it. The cases themselves stay a list of properties
 * rather than a list of type strings.
 *
 * The limit is the one every named set carries. A roster holds
 * the types somebody thought to name, so it bounds what the suite
 * catches and never the whole of what an instance can load, which
 * is what the reason on each entry is for: a reader weighing that
 * gap is weighing why the named ones were named.
 * `docs/architecture/01-invariants.md` is where the properties
 * behind them are argued, and the register there is what says
 * which phase owns each.
 *
 * The block lands alone. The send roster, the schedule-trigger
 * type, the model-node prefix, a matcher over each, and the
 * reader that pulls a node's SQL off its parsed parameters arrive
 * next in this stage.
 */

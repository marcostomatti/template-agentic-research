## Editors, drafts and the write seam

`src/data/drafts.ts` is module-scoped state living in the TAB, and most
of what follows is a consequence of that rather than a design choice.
A later wave flips `src/data/api.ts` to a live API and deletes this
layer; until then these are the app's real rules.

- **The store can never INSERT a row.** An editor gesture that ADDS one
  is adding to that modal's own working copy and to nothing else: the
  save records nothing for it and a reopen does not show it. Do not
  hide it — mint the added row an id the service could never issue
  (negative, descending below the lowest the list carries, the real
  columns being positive serials), export the predicate that reads it
  back, and badge the row with a sentence calling the additions
  unsaved ROWS rather than terms. The minting belongs in the page's
  `.ts` beside the parse, or it is reachable by no test.
- **`applyDrafts` replaces the WHOLE row**, so an omitted key is a key
  the overlaid row no longer HAS. Over the wire an omitted key means
  "keep what you have" and here it does not, so a module with a
  write-only field has to state both readings — a reader taking the
  PUT one for the seam's concludes the opposite of what runs.
- **`page.goto` is a fresh document and resets the store.** A spec
  proving a save survived must re-reach the editor by CLICKING the
  card, never by a second `goto` to the same address: a goto-based
  reopen shows the FIXTURE rows and reddens the case, which reads
  exactly like a save that recorded nothing. `page.reload()` is then
  the reload leg of the same claim, and the one place a fresh document
  is the gesture rather than the bug.
- **Any colocated test touching a read accessor owes a top-level
  `beforeEach(resetDrafts)`** — `api.ts` reads the store on every
  accessor, so without it a case inherits whatever the case before it
  recorded and the file passes or fails on an order nobody chose
  (measured: no-oping that hook reddens six cases). It is also what
  makes block ORDER stop mattering, so new draft-aware cases can be
  appended to an existing file.
- **`invalidateQueries` matches by PREFIX**, so `{ queryKey: [] }`
  matches EVERY query in the cache. Model "what this write can change"
  as a LIST OF WHOLE KEYS, never as one key that could arrive empty:
  an empty LIST invalidates nothing, which is the honest shape for a
  write whose read does not exist yet. Prefix matching is also why a
  two-segment `[slug, resource]` key already covers a three-segment
  single-row read that lands later.
- **`EditorModal` has no refusal channel.** Its save is disabled on
  exactly two readings, `isDirty(draft)` and `saving`, so an editor
  whose page `.ts` answers refusal SENTENCES declines in its own
  `onSave` handler and surfaces them itself. Do not borrow `saving`
  for a third meaning — that flag's whole job is refusing a double
  submit. The cost is a click that is refused rather than prevented,
  so the sentences must be on screen BEFORE the click: a live region
  rendered from mount, not one that arrives with its first sentence.
- **The lexicon term editor draws ONE draft three ways.** `Buckets` is
  the fixed template, `Fields` is the two-column provider under
  `src/dynamic-form/`, and `JSON` is `src/components/JsonEditor.tsx`.
  `src/pages/lexicon/terms.ts` holds the order and it is the FALLBACK
  order as well: from the drawing that assumes the most about a
  category's shape to the one that assumes nothing, so each is reached
  only where the one before it ran out. All three write the SAME draft
  through `toTermPayload` / `withTermPayload` and validate against the
  same `termPayloadSchema` — which is what makes switching presentation
  free rather than a save, and what keeps two drawings from answering
  one question two ways.
- **The JSON box is the fallback under the FIELDS segment, not a
  retired presentation.** `fieldDefsForTermPayload()` answers a def
  list or `null`, and a `null` answer draws the box where the form
  would have gone — so "where the shape allows" is a computed reading
  in a pure `.ts` the unit runner collects, rather than an `if` in the
  modal. The provider landing did NOT replace the box and no prose
  here should say it did: it is the only drawing that can express a
  payload the def list refuses whole, it is how a vocabulary moves
  between two deployments by copy and paste, and it has a second caller
  (`src/pages/sources/SourceConfigApprovalModal.tsx`, `readOnly`) the
  swap never touched. A presentation swap is also a REMOUNT — no two
  of the three are the same element type — so the box re-seeds its
  text from the draft every time it is reached.
- **A modal that NORMALISES the loaded row** (stripping a mask,
  blanking a write-only member) must hand `withLoadedRow` the OPENED
  row as the holder's SOURCE, never the row the query answered.
  Comparing a normalised draft against a raw source reports an
  untouched editor as carrying unsaved work and the footer never falls
  silent. Such an editor also can never report itself clean again once
  the field is retyped — the opener strips the key out of every
  source that can ever arrive — so closing on a successful save is
  what keeps it off the screen. That is inherent, not a fixture
  artefact: an HTTP read answers a mask for the same reason.
- **A page-level draft is cleared in `mutate`'s OWN `onSuccess`**,
  never in the hook's. `useInvalidatingMutation` hands the
  invalidation `Promise.all` back, and react-query awaits the
  mutation-level callback before the per-call one, so by then every
  invalidated read has already answered with the saved value.
  Emptying it earlier puts one frame of pre-save values on screen and
  every gate is green through it.
- **A numeric operator-facing field cannot write its draft on every
  keystroke.** Text that does not read as a value stays VISIBLE and
  stays OUT of the draft, which needs a text override map beside it
  — so a save can be offered while a field shows a refusal, the
  refusal meaning the last keystroke did not reach the draft. Note
  `Number('')` is `0` and `Number('Infinity')` is finite-looking, so
  the guard is a non-empty check plus `Number.isFinite`, never
  `!Number.isNaN`. Trimming inside a MOVER is safe only where the
  modal holds its own typed text; a control drawn straight from a
  trimmed draft swallows the space between two words as the second is
  being typed.
- **Adding an accessor SHAPE costs partitions, not assertions.** Both
  `api.test.ts` and `hooks.test.ts` partition the barrel by SHAPE, so
  a single-row read `(slug, id)`, a parent-keyed child list and a
  write each need their own NAME LIST and case TABLE rather than a row
  of a neighbour's — a read taking an id dropped into the
  slug-alone table is driven with `undefined` and its refusal is read
  as the unknown-slug one. Measured blast radius for one such
  accessor: five partitions in each file plus the shared-options
  roster. Budget a commit for the partitions BEFORE writing a single
  new assertion, and add a third population rather than an exemption
  filter, which lets a member of the new shape hide among the old.
- **Only ONE fixture domain carries rows.** `example-tech-radar` is
  seeded and `example-reading-list` is deliberately empty, so a read
  of the sparse domain answers `[]` whatever scope it built — which
  means "scoped by the slug this call was handed" is GREEN under a
  hardcoded slug in `api.ts` and is only half-testable there. Put that
  claim on the WRITE side, where the draft store files whatever it is
  given under whatever scope it is given (measured: all seven scoped
  writes redden by name). A FIXTURE module's own list accessor does
  carry it — the same mutation makes the sparse and unknown reads
  answer the seeded rows — so the limit is a property of the
  OVERLAY layer and not of fixtures.
- **The fixture tables are keyed by id ALONE**, so `findSource(1)`
  answers a row whatever slug stood in the URL, and once the draft
  overlay composes on top a mismatched pair lays one domain's edits
  over another domain's row. Wrap `find*` (not `get*`), check
  `row.domainId` against the resolved domain, and refuse with the SAME
  message a missing row gets — which is what a scoped endpoint
  answers too, and what makes a foreign-row address a real refusal a
  spec can drive rather than a fabricated one.

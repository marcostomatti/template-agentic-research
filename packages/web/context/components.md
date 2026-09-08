## App-local stand-ins for absent `@ar/ui` components

`@ar/ui` ships no `PageHead`; it does now ship `EntityCard`, promoted
into `molecules` on this branch. So the rule here is about what keeps
the one REMAINING promotion cheap, and about what the card surfaces
compose now that theirs has landed.

- `src/components/PageHead.tsx` is the stand-in, and it exists in
  order to be DELETED. It imports NOTHING from this app (no route
  helpers, no `../data` types — every value arrives as a prop), so the
  library could take the file as it stands; and it takes composition
  as plain `ReactNode` SLOTS rather than modelling it as data, which
  would restate the tone and variant vocabulary of `Tag`, `Badge` and
  `Chip` in a shape that then grows a case per surface.
- It deliberately does NOT pre-build the library's own component
  contract (`forwardRef`, an `HTMLAttributes` spread, a
  `cn(className)` merge). Every `@ar/ui` export carries it, nothing in
  this app needs it, and an API with no caller is kept alive by the
  next reader assuming one exists.
- `EntityCard` had NO stand-in on purpose, and now needs none. An
  app-local card abstraction would have had to be unwound to land the
  promoted component, which is the opposite of what a stand-in is for
  — so the card surfaces were refitted onto it one at a time:
  lexicon, then agents, then the connector grid in
  `src/pages/tools/ToolsPage.tsx`. All three are refitted now, and
  `Card` is imported nowhere under `src/` — so a new card surface
  composes `EntityCard`, and reaching for `Card` is the thing to
  explain rather than the default.
- `src/components/FilterBadgeRow.tsx` is app-local for the opposite
  reason to `PageHead`: it is NOT waiting to be promoted. `@ar/ui`
  ships no `FilterBadge` (measured — zero occurrences under
  `packages/ui/src`; `FilterDropdown` hides its options behind a
  trigger and `OptionCard` is panel-sized), and the spec names ONE
  library deliverable for this wave. So it composes `Touchable`
  around `Chip`, and its own docblock enumerates what a promotion
  would have to take over — chiefly the unpressed treatment, which
  is three of `Chip`'s base utilities overridden through `cn` at a
  call site.
- `src/components/ListPage.tsx` is NOT a stand-in and stays for good —
  it composes the router's `Outlet`, which no component library can
  take without taking a router with it. It sits beside `PageHead` and
  EXTENDS `PageHeadProps`, forwarding the rest object whole rather
  than restating the props it passes through: a restated list accepts
  a newly added prop and silently drops it on the way down, which
  type-checks on both sides.
- `src/components/PlaceholderModal.tsx` is the element behind NONE of
  the fourteen modal registrations (seven addresses across two bases).
  The lexicon's two open `src/pages/lexicon/LexiconEditorModal.tsx`,
  the sources' `/edit` pair opens
  `src/pages/sources/SourceEditorModal.tsx`, its `/config` pair opens
  `src/pages/sources/SourceConfigApprovalModal.tsx` and its
  `/failures` pair opens
  `src/pages/sources/SourceFailuresModal.tsx`, the agents' two open
  `src/pages/agents/AgentEditorModal.tsx`, the tools' two open
  `src/pages/tools/ConnectorEditorModal.tsx`, and the digest's two
  open `src/pages/digest/DigestDetailModal.tsx`. Both halves of the
  fraction moved and they moved separately: the numerator shrank by
  two with each surface, the denominator grew by two with each address
  a surface declared BEYOND its first, and the tools connector editor
  took the numerator to zero. The file survives that landing —
  `src/routes/router.test.ts` now asks whether ANY declared address
  opens it, a claim rather than a ledger, and four landed modals cite
  it for the relative-close reading — so removing it is a decision of
  its own.

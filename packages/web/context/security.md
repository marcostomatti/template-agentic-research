## The brand slot (CRITICAL)

The rail's brand block is `WorkspaceMark` plus app-local lockup text,
and the alternatives are ruled OUT rather than merely not chosen:

- `Wordmark` renders the origin project's two brand words straight
  into the DOM. Using it would put another project's name in the
  shipped UI and trip the de-origination sweep the repo-root
  `context/security.md` describes.
- `TomatoMark`'s own docblock restricts the mascot to `EmptyState` and
  the auth screens.
- The `.wordmark` classes in `@ar/ui`'s `tokens.css` are out for the
  same reason as `Wordmark`: they exist to recreate that lockup in
  HTML, and their child class names are origin-branded.

`WorkspaceMark` derives its initials from the `name` it is handed,
which makes it the one brand atom in `@ar/ui` carrying no origin
identity of its own. Compose the app name FROM its two words and let
the mark split it, rather than splitting one string back apart — the
reverse direction needs a fallback for a name that is not two words,
and that fallback renders half a lockup silently. The visible type
beside the mark is `aria-hidden`, because `WorkspaceMark` is a
labelled `img` already carrying the same name.

The package's own `eslint.config.mjs` carries the reference-free
`no-restricted-imports` gate as well, assembled from string parts so
the banned names never appear as literals. That gate reads IMPORTS
only — the brand slot above is prose and markup, and nothing
automated defends it.

/**
 * @packageDocumentation
 * The login screen: the one surface an operator can reach without a
 * session, and the only place in this app that exchanges a credential
 * for one.
 *
 * It renders its OWN layout rather than nesting under `AppLayout`.
 * The shell's rail and topbar read domains, notifications, spend and
 * the operator through `../../data/hooks`, and every one of those
 * reads is about to be refused by a service that has not accepted a
 * credential yet — so a login form inside the shell would paint a
 * frame of failing chrome around itself. The layout here is a page,
 * a card and nothing else.
 *
 * ## Why not `@ar/ui`'s auth screens
 *
 * `AuthShell` and the library's own `LoginPage` are both ruled OUT,
 * and by the rule `../../../context/security.md` already carries
 * rather than by preference: `AuthShell` renders `BrandLockup`
 * unconditionally, which puts the origin project's two brand words
 * and `TomatoMark` straight into the DOM (measured in
 * `packages/ui/src/templates/AuthShell/BrandLockup.tsx`). The
 * library's `LoginPage` composes the same shell and takes no
 * submit handler at all — its whole API is `mode`, `onForgot` and
 * `onSignup`.
 *
 * So the brand block here is the rail's: `WorkspaceMark`, which
 * derives its initials from the name it is handed and carries no
 * origin identity, plus app-local lockup type that is `aria-hidden`
 * because the mark is already a labelled `img` saying the same
 * words.
 *
 * ## The submit control is a NATIVE button
 *
 * `@ar/ui`'s `Button` cannot be a form's submit button. Its props are
 * `Omit<ButtonHTMLAttributes, 'type'>` and it hard-wires
 * `type="button"` on the element it renders, so there is no spelling
 * of `<Button>` that submits a form. That is not merely a missing
 * mouse path: a form carrying TWO fields that block implicit
 * submission and NO submit button gets no default button at all, so
 * Enter in either box would do nothing and the page would look
 * broken to anyone who never reaches for the mouse.
 *
 * The app-local answer is the one this package already uses for the
 * `asChild` constraint — drop to the element and borrow the classes.
 * `button()` and `touchable()` are both exported from the barrel, and
 * the two calls below are exactly what `Button` itself composes.
 *
 * ## Refusals
 *
 * Every sentence shown comes from `./loginForm.ts`, which owns the
 * refusal vocabulary and reads nothing off the error but its code —
 * see that module's header for the user-name oracle this closes.
 *
 * The region holding it is `role="status"` and is rendered FROM MOUNT
 * rather than arriving with its first sentence: assistive technology
 * watches regions that already exist, and one inserted together with
 * its content is routinely missed. It is named, so a spec addresses
 * it by name rather than by a bare `status` role.
 *
 * Neither input carries `required`. The browser's own bubble would
 * pre-empt the refusal this app writes, leaving two refusal
 * vocabularies on one form and putting the one that IS tested behind
 * the one that is not.
 *
 * Nothing is cleared after a refusal. An operator who mistyped one
 * character is mid-correction, and a form that empties itself makes
 * them retype the half that was right.
 *
 * ## While a request is out
 *
 * Nothing here is given the `disabled` attribute. Disabling the
 * element that currently holds focus drops that focus to the document
 * body, and the control just pressed is exactly the element holding
 * it — so a refusal would be announced into a page whose next Tab
 * restarts from the top, which is the focus outcome
 * `../../../context/accessibility.md` already carries a ledger about
 * for the modals.
 *
 * The submit control is marked `aria-disabled` and dimmed instead,
 * and what actually refuses a second attempt is the guard at the top
 * of the handler: one branch covers the second click and the stray
 * Enter alike, where an attribute would leave the keyboard path to
 * the browser. The two boxes stay editable, since the credential was
 * read before the request went out and typing into them cannot
 * change what is already in flight.
 *
 * ## Theme
 *
 * `useTheme` is called here for the same reason `Topbar` calls it:
 * the hook is what writes `data-theme` onto the document, and the
 * topbar is NOT mounted on this route. Without this call a stored
 * dark preference would be ignored for the whole of the login screen
 * and then snap into place the moment the shell mounted. The
 * switcher is rendered beside it because this is the only screen an
 * operator without a session can see, and a theme they cannot change
 * from here is a preference they cannot change at all.
 *
 * ## After a success
 *
 * `login` has already stored the session by the time it resolves, so
 * the only thing left is to leave. The target is
 * {@link safeReturnPath} over the `next` parameter — the open-redirect
 * guard is on the READ side, in `./returnPath.ts` — and the
 * navigation REPLACES the history entry, so Back from the surface an
 * operator just reached does not land on the form they just left.
 *
 * `isSubmitting` is deliberately not cleared on that path: the
 * component is about to unmount, and clearing it would be a state
 * write racing the navigation for no visible gain.
 *
 * Nothing in this file is reachable from the unit suite, which is
 * node-only and collects `.ts` alone. Every decision it makes lives
 * in `./loginForm.ts` and `./returnPath.ts`, which are pure and
 * covered; what is left here is composition the Playwright specs
 * drive.
 */

import type { FormEvent } from 'react';

import {
  Banner,
  FormField,
  TextInput,
  ThemeSwitcher,
  WorkspaceMark,
  button,
  cn,
  touchable,
} from '@ar/ui';
import { useId, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { useTheme } from '../../app-shell/theme';
import { login } from '../../data/http/auth';

import {
  describeLoginFailure,
  readCredential,
} from './loginForm';
import { RETURN_PARAM, safeReturnPath } from './returnPath';

/**
 * The lockup's first word, carrying the mark's first initial.
 *
 * A SECOND copy of the two words `../../app-shell/Sidebar.tsx` holds,
 * and knowingly: the rail's are module-private in a `.tsx`, and
 * exporting them from there would pull a component module into this
 * route's chunk for two strings. A rename changes both files, and a
 * third caller is where they earn a module of their own.
 */
const APP_NAME_LEAD = 'agentic';

/** The lockup's second word, carrying the mark's second initial. */
const APP_NAME_TRAIL = 'research';

/**
 * The app's own name, composed from the two words above.
 *
 * Built from the halves rather than split back out of one string, for
 * the rail's reason: `WorkspaceMark` derives its initials by
 * splitting on whitespace, and the other direction needs a fallback
 * for a name that is not two words — a fallback that renders half a
 * lockup silently.
 */
const APP_NAME = `${APP_NAME_LEAD} ${APP_NAME_TRAIL}`;

/** The mono kicker above the heading. */
const EYEBROW = 'deployment access';

/** The heading, and the document's one `h1` on this route. */
const HEADING = 'Sign in';

/** The line under the heading, naming what the credential is for. */
const STANDFIRST = 'This deployment checks a credential before it will '
  + 'answer for its research domains.';

/** What names the region a refusal is announced in. */
const REFUSED_REGION_LABEL = 'Why this sign-in did not happen';

/** What the refusal banner is titled. */
const REFUSED_TITLE = 'Not signed in';

/** The user-name box's label. */
const USER_LABEL = 'User name';

/** The password box's label. */
const PASSWORD_LABEL = 'Password';

/** What the submit control says at rest. */
const SUBMIT_LABEL = 'Sign in';

/** What it says while a request is out. */
const SUBMIT_PENDING_LABEL = 'Signing in…';

/**
 * The closing line, and an honest one: the session lives in this tab's
 * `sessionStorage` and in memory, so another tab is another sign-in
 * and closing this one ends it.
 */
const SESSION_NOTE = 'A session is held for this browser tab only.';

/**
 * The login screen.
 *
 * @returns The page, its own layout and all.
 */
export const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const userId = useId();
  const passwordId = useId();

  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [refusal, setRefusal] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resolved on every render rather than held: the guard is pure, the
  // parameter can only change by a navigation, and a copy in state
  // would be one more thing that can disagree with the URL.
  const returnPath = safeReturnPath(searchParams.get(RETURN_PARAM));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // A second submit while the first is out would race two sessions
    // into one store. The control is marked `aria-disabled` rather
    // than disabled — the header says why — so this branch is what
    // actually refuses it, on the click path and the Enter path
    // alike.
    if (isSubmitting) {
      return;
    }

    const reading = readCredential({ user, password });

    if (!reading.ok) {
      setRefusal(reading.refusal);

      return;
    }

    // Cleared before the request rather than after it, so the region
    // does not show the last refusal while the next attempt is out.
    setRefusal(undefined);
    setIsSubmitting(true);

    try {
      await login(reading.credential);
    } catch (error) {
      setRefusal(describeLoginFailure(error));
      setIsSubmitting(false);

      return;
    }

    void navigate(returnPath, { replace: true });
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-7 bg-surface-sunk px-6 py-14">
      <div className="flex w-full max-w-[400px] items-center gap-2.5">
        <WorkspaceMark name={APP_NAME} size="md" />
        {/*
          Hidden from the accessibility tree: WorkspaceMark is a
          labelled `img` already carrying this name, so announcing the
          type beside it would say the same words twice. The rail does
          exactly this, for exactly this reason.
        */}
        <span
          aria-hidden="true"
          className="font-display text-[17px] font-bold tracking-[-0.02em]"
        >
          <span className="text-fg1">{APP_NAME_LEAD}</span>{' '}
          <span className="text-accent">{APP_NAME_TRAIL}</span>
        </span>

        {/* Pushes the one control that is not the form to the far
            edge, so the card below reads as the whole of the task. */}
        <div className="flex-1" />

        <ThemeSwitcher theme={theme} onToggle={setTheme} />
      </div>

      <div className="w-full max-w-[400px] rounded-xl border border-border-soft bg-surface-1 p-8 shadow-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg3">
          {EYEBROW}
        </p>
        <h1 className="mt-2 font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-fg1">
          {HEADING}
        </h1>
        <p className="mt-2 text-sm leading-normal text-fg2">
          {STANDFIRST}
        </p>

        {/*
          From mount rather than with its first sentence — the header
          says why — and named so a spec addresses it by name.
        */}
        <div role="status" aria-label={REFUSED_REGION_LABEL} className="mt-5">
          {refusal !== undefined && (
            <Banner tone="danger" title={REFUSED_TITLE}>
              {refusal}
            </Banner>
          )}
        </div>

        <form
          className="mt-5 flex flex-col gap-4"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          <FormField label={USER_LABEL} htmlFor={userId}>
            <TextInput
              id={userId}
              value={user}
              onChange={setUser}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />
          </FormField>

          <FormField label={PASSWORD_LABEL} htmlFor={passwordId}>
            <TextInput
              id={passwordId}
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />
          </FormField>

          {/*
            A native submit button wearing `Button`'s own classes. The
            header measures why the component cannot stand here: it
            omits `type` from its props and renders `type="button"`,
            and a two-field form with no submit button has no default
            button for Enter to press.
          */}
          <button
            type="submit"
            aria-disabled={isSubmitting}
            className={cn(
              touchable({ rounded: 'md', stretch: true, noBrightness: false }),
              button({ variant: 'primary', size: 'lg', block: true }),
              'mt-1 aria-disabled:opacity-60',
            )}
          >
            {isSubmitting
              ? SUBMIT_PENDING_LABEL
              : SUBMIT_LABEL}
          </button>
        </form>

        <p className="mt-5 border-t border-border-soft pt-4 text-xs text-fg3">
          {SESSION_NOTE}
        </p>
      </div>
    </main>
  );
};

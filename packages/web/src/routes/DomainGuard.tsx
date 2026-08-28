/**
 * @packageDocumentation
 * The one check the `/d/:domainSlug` pattern cannot make for itself.
 *
 * `/d/Bad/digest` MATCHES that pattern, so it is not a case the router's
 * catch-all can ever see. The chrome below then resolves a base from the
 * slug on every render, and `domainBase` throws on anything that is not
 * one lowercase path segment — decoded, so a `%2F` would otherwise build
 * a base pointing somewhere else entirely. Without this wrapper a
 * mistyped domain address takes the whole shell down instead of
 * rendering a page.
 *
 * react-router v7 cannot express the constraint on the pattern — a path
 * pattern carries no regex — so it has to live in the route element,
 * which is what this is.
 *
 * It refuses rather than repairs. There is no near-miss to redirect to:
 * a malformed slug names nothing, and guessing which domain was meant is
 * how an operator ends up reading another domain's digest believing it
 * is their own.
 *
 * An UNKNOWN but well-formed slug is deliberately NOT refused here. The
 * shell's every read is deployment-level, so it renders correctly under
 * any slug; it is the domain-scoped PAGE reads that have no answer, and
 * saying so is theirs. A check here would also have to consult the
 * domain list, which is a synchronous fixture today and an HTTP read
 * after q15 — it would have to be rewritten as a loader the moment it
 * became true.
 *
 * This lives beside `./router.tsx` rather than inside it because a file
 * that DEFINES a component may only EXPORT components, and the router is
 * a route table whose whole point is exporting data.
 *
 * Nothing here is reachable from the unit suite, which is node-only and
 * collects `.ts` alone. The Playwright unknown-route spec drives it.
 */

import type { ReactNode } from 'react';

import { Button, EmptyState } from '@ar/ui';
import { Link, useParams } from 'react-router';

import { SINGLE_DOMAIN_BASE, domainBase } from './paths';

/**
 * What a malformed domain address renders instead of the app.
 *
 * Standing on its own, with no shell around it, because the shell is
 * unavailable here by construction rather than by choice — every piece
 * of it resolves a base from the same slug that just failed. So this is
 * the one not-found in the app that has to carry its own way out; the
 * other renders below a mounted rail, which is a better exit than a
 * button repeating one of its entries.
 *
 * The link points at the single-domain base, whose index redirect then
 * takes the operator to the digest.
 */
const MALFORMED_DOMAIN = (
  <div className="flex min-h-dvh items-center justify-center p-6">
    <EmptyState
      title="Domain not found"
      description="That address is not a domain this deployment can read."
      action={(
        <Button asChild variant="secondary" size="sm">
          <Link to={SINGLE_DOMAIN_BASE}>Back to the digest</Link>
        </Button>
      )}
    />
  </div>
);

/**
 * Whether a matched `:domainSlug` can be turned into a route base.
 *
 * Asked by CALLING `domainBase` and catching, rather than by restating
 * its pattern: the rule has one owner and a copy here would be a second
 * one to keep in step. The call is the check.
 *
 * @param domainSlug - The matched parameter. Always present under the
 * domain pattern, since a required segment cannot match empty, but typed
 * as `useParams` hands it over.
 * @returns Whether the chrome below can resolve a base from it.
 */
const isRoutableDomainSlug = (domainSlug: string | undefined): boolean => {
  if (domainSlug === undefined) {
    return false;
  }

  try {
    domainBase(domainSlug);

    return true;
  } catch {
    return false;
  }
};

/** What the guard wraps. */
export interface DomainGuardProps {
  /**
   * The domain-scoped tree's chrome, rendered only for a slug the app
   * can build a base from. A node rather than a render prop: the guard
   * has nothing to hand it, and passing the children through untouched
   * is what keeps `./router.tsx` the single place naming the shell.
   */
  readonly children: ReactNode;
}

/**
 * Gate the domain-scoped route tree on its slug.
 *
 * @param props - The chrome to render for a routable slug.
 * @returns Its children, or a self-contained not-found.
 */
export const DomainGuard = ({ children }: DomainGuardProps) => {
  const { domainSlug } = useParams<{ domainSlug?: string }>();

  return isRoutableDomainSlug(domainSlug)
    ? children
    : MALFORMED_DOMAIN;
};

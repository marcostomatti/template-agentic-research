/**
 * The two checks `POST /__devtools/report` takes before it looks at a
 * body: is this request the dev server's own page talking to it, and
 * did it arrive over the loopback interface.
 *
 * Spec item 8.3 is the authority — "cross-origin refused (`Origin`/
 * `Host` must be the dev server's own); non-loopback remote addresses
 * refused unless `allowLan`". Both live here, pure: they read the two
 * arguments they are handed, touch no filesystem, no clock, no socket
 * and no module state, and answer a value rather than writing a
 * response. `./plugin.ts` is where they are called in order and where
 * a refusal becomes a status code.
 *
 * ## Why these exist at all
 *
 * The consuming app runs `vite --host`, so the dev server is reachable
 * from every machine on the network the laptop is on, and the report
 * endpoint writes files into the repository. Without the second check
 * that is a write primitive handed to whoever finds the port; without
 * the first, any page the browser happens to have open can post
 * through the operator's own browser.
 *
 * ## What they deliberately do NOT do
 *
 * - {@link isSameOriginRequest} pins the SCHEME and the PORT against
 *   the dev server's own, and the origin's host against the `Host`
 *   the request carried. It cannot tell `http://localhost:5173` from
 *   `http://rebound.example:5173` when the request carries both
 *   headers consistently, because a DNS-rebinding attacker controls
 *   both. Refusing an unexpected HOSTNAME is Vite's `server.
 *   allowedHosts`, which is deny-by-default from Vite 6 and is the
 *   complementary guard rather than something restated here.
 * - {@link isAllowedRemote} reads the SOCKET's peer address and
 *   nothing else. No proxy header is consulted — see
 *   {@link isAllowedRemote} for why a spoofed one changes nothing.
 * - Neither check authenticates. There is no secret and no session:
 *   these are a locality guard over a development-only endpoint, and
 *   the plugin registers for `serve` alone so none of it exists in a
 *   built app.
 *
 * ## Why the names read as predicates and the answers do not
 *
 * Both functions are named in the plan, and both answer a
 * {@link DevToolsRequestCheck} rather than a boolean, because a
 * refused request has to say WHICH rule refused it: the plugin logs
 * the rule, and a `false` would make `origin-missing` (a caller that
 * is not a browser page) indistinguishable from `remote-not-loopback`
 * (a machine on the LAN), which are different problems with different
 * fixes. The call site still reads as a predicate through
 * {@link DevToolsRequestCheck.allowed}.
 *
 * ## Mutation note - what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, running `bun x vitest run
 * src/vite/origin.test.ts` from `packages/dev-tools`, and restoring
 * this file byte-identical. The baseline is `Tests 28 passed (28)`.
 *
 * - Dropping the `originUrl.hostname !== hostUrl.hostname`
 *   comparison, so a matching scheme and port is enough, answers
 *   `Tests 2 failed | 26 passed (28)` - `refuses an Origin naming
 *   another host` and `answers a cross-origin request the same with
 *   and without an X-Forwarded-For naming the server`. The second is
 *   the point: the forwarded-header case is a reading of THIS
 *   comparison, not a case that would pass whatever the check did.
 * - Dropping the effective-port comparison for the ORIGIN answers `1
 *   failed | 27 passed`, the one being `refuses an Origin on another
 *   port`. The `Host` port comparison is pinned separately by
 *   `refuses a Host naming another port`, which survives this leg.
 * - Answering allowed for a missing `Origin` answers `3 failed | 25
 *   passed` - the absent, the empty and the capital-O cases, which
 *   are one rule read three ways.
 * - Reading `127.` as a PREFIX rather than parsing four octets
 *   answers `1 failed | 27 passed` - `refuses an address that merely
 *   begins with the loopback octets`.
 * - Letting `allowLan` answer before the absent-address check, so it
 *   rescues an unknown peer, answers `1 failed | 27 passed` -
 *   `refuses an unknown remote address even when allowLan is set`.
 * - Dropping the `::ffff:` unwrapping answers `1 failed | 27 passed`
 *   - `allows an IPv4-mapped IPv6 loopback address`. The refusal side
 *   of the same unwrapping (`::ffff:192.168.1.24` without `allowLan`)
 *   survives it, because a mapped address that is not recognised is
 *   refused either way - so that case reads as a control over the
 *   spelling, not over the unwrapping.
 *
 * One thing no case pins: a DNS-rebinding request whose `Origin` and
 * `Host` agree on a hostname that is not the dev server's. Deleting
 * every hostname comparison here would still leave that request
 * refused only by the port check, and the suite cannot say otherwise
 * - Vite's `server.allowedHosts` is what refuses it, as the section
 * above says.
 */

import type { IncomingHttpHeaders } from 'node:http';

/**
 * Which rule refused a request.
 *
 * Closed at six, and each member names a DIFFERENT fix: the three
 * header rules are about who is talking, the three address rules
 * about where from.
 */
export type DevToolsRequestRule =
  | 'origin-missing'
  | 'origin-mismatch'
  | 'host-missing'
  | 'host-mismatch'
  | 'remote-missing'
  | 'remote-not-loopback';

/**
 * A refused request, carrying the rule that refused it.
 *
 * {@link reason} is a FIXED sentence per rule and never interpolates
 * anything the request carried, so a plugin that puts it in a response
 * body cannot reflect attacker-controlled text back to a browser.
 */
export interface DevToolsRequestRefusal {
  /** Always `false`; the discriminant. */
  readonly allowed: false;

  /** Which rule refused. */
  readonly rule: DevToolsRequestRule;

  /** A fixed explanation of {@link rule}, safe to echo. */
  readonly reason: string;
}

/** A request that passed the check it was handed to. */
export interface DevToolsRequestAllowed {
  /** Always `true`; the discriminant. */
  readonly allowed: true;
}

/**
 * What both checks answer.
 *
 * A discriminated union rather than a boolean plus an out-parameter,
 * so a caller that reads {@link DevToolsRequestRefusal.rule} without
 * testing `allowed` first does not compile.
 */
export type DevToolsRequestCheck =
  | DevToolsRequestAllowed
  | DevToolsRequestRefusal;

/**
 * What {@link isSameOriginRequest} needs to know about the dev server
 * it is guarding.
 *
 * Deliberately NOT a `ViteDevServer`: this module stays pure and
 * testable with an object literal, and `./plugin.ts` is the one place
 * that reads Vite's resolved config to build one.
 */
export interface DevToolsServerOrigin {
  /**
   * The scheme the dev server answers on, spelled the way
   * `URL.protocol` spells it - with the colon.
   */
  readonly protocol: 'http:' | 'https:';

  /** The port the dev server listens on. */
  readonly port: number;
}

/** The fixed explanation each rule answers with. */
const REASONS: Readonly<Record<DevToolsRequestRule, string>> = Object.freeze({
  'origin-missing':
    'The request carried no Origin header, so it cannot be shown to '
    + 'come from a page the dev server serves.',
  'origin-mismatch':
    'The Origin on this request is not the origin the dev server '
    + 'answers on.',
  'host-missing':
    'The request carried no Host header, so there is no origin to '
    + 'hold it to.',
  'host-mismatch':
    'The Host on this request is not the host the dev server answers '
    + 'on.',
  'remote-missing':
    'The remote address of this request is unknown, so it cannot be '
    + 'shown to have arrived over loopback.',
  'remote-not-loopback':
    'The request did not arrive over loopback, and allowLan is not '
    + 'set.',
});

/** The one allowed answer, shared because it carries no detail. */
const ALLOWED: DevToolsRequestAllowed = Object.freeze({ allowed: true });

/**
 * Build the refusal for a rule.
 *
 * @param rule - Which rule refused.
 * @returns A frozen refusal carrying the rule and its fixed reason.
 */
function refuse(rule: DevToolsRequestRule): DevToolsRequestRefusal {
  return Object.freeze({
    allowed: false as const,
    rule,
    reason: REASONS[rule],
  });
}

/**
 * The port a URL actually means, filling in the scheme default the
 * spelling leaves out.
 *
 * `new URL('http://localhost')` answers `''` for `port`, and a request
 * to a dev server on port 80 spells its `Host` as bare `localhost`, so
 * comparing the raw strings would refuse a legitimate request.
 *
 * @param url - A parsed absolute URL.
 * @returns The effective port number.
 */
function effectivePort(url: URL): number {
  if (url.port !== '') {
    return Number(url.port);
  }

  if (url.protocol === 'https:') {
    return 443;
  }

  return 80;
}

/**
 * Parse an absolute URL, answering `null` rather than throwing.
 *
 * @param value - The candidate text.
 * @returns The URL, or `null` when it is not one.
 */
function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    // An opaque origin arrives as the literal 'null', a duplicated
    // Origin header as 'a, b', and a hand-rolled client can send
    // anything at all. All three are the same answer: not a URL.
    return null;
  }
}

/**
 * Read a single header value.
 *
 * @param value - Whatever the header record held.
 * @returns The trimmed value, or `null` when the header was absent,
 * empty or repeated into an array.
 */
function readHeader(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed === '') {
    return null;
  }

  return trimmed;
}

/**
 * Hold a request to the dev server's own origin.
 *
 * Both headers are read from the record node's `IncomingMessage`
 * exposes, whose names are already lower-cased by the HTTP parser; a
 * hand-built record spelling `Origin` with a capital reads as absent,
 * which refuses rather than admits.
 *
 * The checks run in this order, and the first to refuse wins:
 *
 * 1. No `Origin` - `origin-missing`. A browser sends one on every
 *    CORS-eligible request, which a `POST` always is, so its absence
 *    means the caller is not a page.
 * 2. No `Host`, an unparseable one, or one naming another port -
 *    `host-missing` / `host-mismatch`.
 * 3. An `Origin` that does not parse, or whose scheme, effective port
 *    or host is not the one the request was addressed to -
 *    `origin-mismatch`.
 *
 * @param headers - The request headers, lower-cased as node hands them
 * over.
 * @param server - The dev server's own scheme and port.
 * @returns Allowed, or the refusal naming the rule.
 */
export function isSameOriginRequest(
  headers: IncomingHttpHeaders,
  server: DevToolsServerOrigin,
): DevToolsRequestCheck {
  const origin = readHeader(headers.origin);

  if (origin === null) {
    return refuse('origin-missing');
  }

  const host = readHeader(headers.host);

  if (host === null) {
    return refuse('host-missing');
  }

  // Parsed through a URL rather than split on ':', so a bracketed
  // IPv6 authority such as '[::1]:5173' is taken apart by the same
  // code that takes the Origin apart, and the two hostnames are
  // canonicalised the same way before they are compared.
  const hostUrl = parseUrl(`${server.protocol}//${host}`);

  if (hostUrl === null || effectivePort(hostUrl) !== server.port) {
    return refuse('host-mismatch');
  }

  const originUrl = parseUrl(origin);

  if (originUrl === null) {
    return refuse('origin-mismatch');
  }

  if (originUrl.protocol !== server.protocol) {
    return refuse('origin-mismatch');
  }

  if (effectivePort(originUrl) !== server.port) {
    return refuse('origin-mismatch');
  }

  if (originUrl.hostname !== hostUrl.hostname) {
    return refuse('origin-mismatch');
  }

  return ALLOWED;
}

/** The two spellings of the IPv6 loopback address. */
const IPV6_LOOPBACKS: ReadonlySet<string> = new Set([
  '::1',
  '0:0:0:0:0:0:0:1',
]);

/** The prefix an IPv4 address wears when it arrives over an IPv6 socket. */
const IPV4_MAPPED_PREFIX = '::ffff:';

/** The first octet of the whole `127.0.0.0/8` loopback range. */
const IPV4_LOOPBACK_OCTET = 127;

/** How many octets a dotted IPv4 address has. */
const IPV4_OCTETS = 4;

/** The largest value one octet may hold. */
const IPV4_OCTET_MAX = 255;

/** One to three digits, and nothing else - no sign, no leading plus. */
const OCTET_PATTERN = /^\d{1,3}$/;

/**
 * Strip the spellings a socket address may arrive wearing.
 *
 * @param address - The raw peer address.
 * @returns The address lower-cased, unbracketed and without its IPv6
 * zone index.
 */
function normaliseAddress(address: string): string {
  const trimmed = address.trim().toLowerCase();

  const unbracketed = trimmed.startsWith('[') && trimmed.endsWith(']')
    ? trimmed.slice(1, -1)
    : trimmed;

  const zone = unbracketed.indexOf('%');

  if (zone === -1) {
    return unbracketed;
  }

  return unbracketed.slice(0, zone);
}

/**
 * Is this a dotted IPv4 address inside `127.0.0.0/8`.
 *
 * All four octets must be present and numeric. The shorthand forms a
 * `connect()` would accept - `127.1`, or a single 32-bit integer -
 * are refused rather than resolved, because a socket's peer address
 * is always canonical and refusing is the safe direction for anything
 * else.
 *
 * @param value - The normalised address.
 * @returns `true` when it is a loopback IPv4 address.
 */
function isIpv4Loopback(value: string): boolean {
  const octets = value.split('.');

  if (octets.length !== IPV4_OCTETS) {
    return false;
  }

  const wellFormed = octets.every(
    (octet) => OCTET_PATTERN.test(octet) && Number(octet) <= IPV4_OCTET_MAX,
  );

  if (!wellFormed) {
    return false;
  }

  return Number(octets[0]) === IPV4_LOOPBACK_OCTET;
}

/**
 * Did this address arrive over the loopback interface.
 *
 * @param address - The normalised peer address.
 * @returns `true` for `::1`, its long spelling, and every address in
 * `127.0.0.0/8`, including the IPv4-mapped IPv6 form a dual-stack
 * socket reports.
 */
function isLoopbackAddress(address: string): boolean {
  const normalised = normaliseAddress(address);

  if (normalised === '') {
    return false;
  }

  if (IPV6_LOOPBACKS.has(normalised)) {
    return true;
  }

  if (normalised.startsWith(IPV4_MAPPED_PREFIX)) {
    return isIpv4Loopback(normalised.slice(IPV4_MAPPED_PREFIX.length));
  }

  return isIpv4Loopback(normalised);
}

/**
 * Refuse an address that did not arrive over loopback, unless the
 * operator asked for the LAN.
 *
 * ## A proxy header changes nothing
 *
 * The only address this reads is the one the caller passes, which
 * `./plugin.ts` takes from `req.socket.remoteAddress` - the peer of
 * the TCP connection, which the kernel knows and no request body or
 * header can alter. `X-Forwarded-For`, `X-Real-IP` and their
 * relatives are ordinary headers any client may write, and this
 * module never looks at them, so setting one neither rescues a LAN
 * request nor condemns a loopback one. That is the whole defence: a
 * dev server sits behind no trusted proxy, so there is no
 * circumstance in which a forwarded header would be worth believing.
 *
 * @param remoteAddress - The socket's peer address, or `undefined`
 * when the socket has already closed.
 * @param allowLan - The plugin option. `true` accepts any address,
 * which is what an operator testing from a phone on the same network
 * asks for.
 * @returns Allowed, or the refusal naming the rule.
 */
export function isAllowedRemote(
  remoteAddress: string | undefined,
  allowLan: boolean,
): DevToolsRequestCheck {
  if (typeof remoteAddress !== 'string' || remoteAddress.trim() === '') {
    // Refused even under `allowLan`, and on purpose: an address the
    // plugin could not read is not evidence of anything, and
    // `allowLan` is a statement about WHICH networks are acceptable,
    // not permission to skip the question.
    return refuse('remote-missing');
  }

  if (isLoopbackAddress(remoteAddress)) {
    return ALLOWED;
  }

  if (allowLan) {
    return ALLOWED;
  }

  return refuse('remote-not-loopback');
}

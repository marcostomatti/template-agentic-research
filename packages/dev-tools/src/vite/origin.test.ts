import type { DevToolsServerOrigin } from './origin';
import type { IncomingHttpHeaders } from 'node:http';

import { describe, expect, it } from 'vitest';

import { isAllowedRemote, isSameOriginRequest } from './origin';

/**
 * ## Why there is no server, no socket and no fixture here
 *
 * `origin.ts` reads its two arguments and nothing else, so a case is
 * an object literal and an assertion. Nothing is listened on, nothing
 * is written, and no case depends on the order the others ran in.
 *
 * ## Why so many cases carry a positive control
 *
 * Every refusal here is a check answering `allowed: false`, and a
 * check hard-wired to refuse would pass all of them. So the cases
 * that could read as a false negative pair the refusal with the ONE
 * edit that should have made it pass - a present `Origin`, a set
 * `allowLan` - and assert that the same call then allows.
 *
 * Refusals run before accepting cases, which is this plan's order for
 * every test file.
 */

/** The dev server every header case is held against. */
const SERVER: DevToolsServerOrigin = Object.freeze({
  protocol: 'http:',
  port: 5173,
});

/** The headers a page served by {@link SERVER} sends on a POST. */
const SAME_ORIGIN: IncomingHttpHeaders = Object.freeze({
  origin: 'http://localhost:5173',
  host: 'localhost:5173',
});

/** An address on the operator's network, not on loopback. */
const LAN_ADDRESS = '192.168.1.24';

describe('what the same-origin check refuses', () => {
  it('refuses a request carrying no Origin header', () => {
    // Arrange: what a curl, a script or another server sends - a Host
    // is unavoidable in HTTP/1.1, an Origin is not.
    const headers: IncomingHttpHeaders = { host: 'localhost:5173' };

    // Act
    const check = isSameOriginRequest(headers, SERVER);

    // Assert
    expect(check).toEqual({
      allowed: false,
      rule: 'origin-missing',
      reason: expect.any(String),
    });

    // The positive control: the same call with the one missing header
    // present allows, so a check that refused everything would fail
    // here rather than pass the assertion above.
    expect(isSameOriginRequest(SAME_ORIGIN, SERVER)).toEqual({
      allowed: true,
    });
  });

  it('refuses a request whose Origin header is empty', () => {
    // Arrange: a header sent with no value is not evidence of anything.
    const headers: IncomingHttpHeaders = {
      origin: '   ',
      host: 'localhost:5173',
    };

    // Act + Assert
    expect(isSameOriginRequest(headers, SERVER)).toMatchObject({
      allowed: false,
      rule: 'origin-missing',
    });
  });

  it('refuses an Origin header spelled with a capital O', () => {
    // Arrange: node lower-cases incoming header names, so a record
    // holding 'Origin' did not come from a request. Pinned because
    // reading it would be the difference between a guard and a
    // formality.
    const headers = {
      Origin: 'http://localhost:5173',
      host: 'localhost:5173',
    } as IncomingHttpHeaders;

    // Act + Assert: absent, which refuses rather than admits.
    expect(isSameOriginRequest(headers, SERVER)).toMatchObject({
      allowed: false,
      rule: 'origin-missing',
    });
  });

  it('refuses a request carrying no Host header', () => {
    // Arrange
    const headers: IncomingHttpHeaders = {
      origin: 'http://localhost:5173',
    };

    // Act + Assert
    expect(isSameOriginRequest(headers, SERVER)).toMatchObject({
      allowed: false,
      rule: 'host-missing',
    });
  });

  it('refuses an Origin naming another host', () => {
    // Arrange: the shape that matters - a page on another origin
    // posting through the operator's own browser, which carries the
    // dev server's Host because that is where the request went.
    const headers: IncomingHttpHeaders = {
      origin: 'http://attacker.example:5173',
      host: 'localhost:5173',
    };

    // Act
    const check = isSameOriginRequest(headers, SERVER);

    // Assert
    expect(check).toMatchObject({
      allowed: false,
      rule: 'origin-mismatch',
    });

    // And the refusal says nothing the request supplied, so a plugin
    // echoing it cannot reflect attacker-controlled text.
    expect(JSON.stringify(check)).not.toContain('attacker.example');
  });

  it('refuses an Origin on another port', () => {
    // Arrange: a second dev server on the same machine is a different
    // origin to the browser and must be one here too.
    const headers: IncomingHttpHeaders = {
      origin: 'http://localhost:4173',
      host: 'localhost:5173',
    };

    // Act + Assert
    expect(isSameOriginRequest(headers, SERVER)).toMatchObject({
      allowed: false,
      rule: 'origin-mismatch',
    });
  });

  it('refuses an Origin on another scheme', () => {
    // Arrange: https://localhost:5173 is not http://localhost:5173.
    const headers: IncomingHttpHeaders = {
      origin: 'https://localhost:5173',
      host: 'localhost:5173',
    };

    // Act + Assert
    expect(isSameOriginRequest(headers, SERVER)).toMatchObject({
      allowed: false,
      rule: 'origin-mismatch',
    });
  });

  it('refuses an opaque Origin', () => {
    // Arrange: the literal text a sandboxed iframe or a redirected
    // form sends, which is not a URL at all.
    const headers: IncomingHttpHeaders = {
      origin: 'null',
      host: 'localhost:5173',
    };

    // Act + Assert
    expect(isSameOriginRequest(headers, SERVER)).toMatchObject({
      allowed: false,
      rule: 'origin-mismatch',
    });
  });

  it('refuses a Host naming another port', () => {
    // Arrange: both headers agree, and neither is this dev server.
    const headers: IncomingHttpHeaders = {
      origin: 'http://localhost:4173',
      host: 'localhost:4173',
    };

    // Act + Assert
    expect(isSameOriginRequest(headers, SERVER)).toMatchObject({
      allowed: false,
      rule: 'host-mismatch',
    });
  });

  it('refuses a Host that is not an authority', () => {
    // Arrange: a Host no URL parser accepts.
    const headers: IncomingHttpHeaders = {
      origin: 'http://localhost:5173',
      host: 'not a host name',
    };

    // Act + Assert
    expect(isSameOriginRequest(headers, SERVER)).toMatchObject({
      allowed: false,
      rule: 'host-mismatch',
    });
  });
});

describe('what the remote-address check refuses', () => {
  it('refuses a request whose remote address is unknown', () => {
    // Arrange + Act: what a socket that has already closed answers.
    const check = isAllowedRemote(undefined, false);

    // Assert
    expect(check).toEqual({
      allowed: false,
      rule: 'remote-missing',
      reason: expect.any(String),
    });

    // The positive control: a known loopback address allows.
    expect(isAllowedRemote('127.0.0.1', false)).toEqual({ allowed: true });
  });

  it('refuses an unknown remote address even when allowLan is set', () => {
    // Arrange + Act + Assert: allowLan says WHICH networks are
    // acceptable; it is not permission to skip the question.
    expect(isAllowedRemote(undefined, true)).toMatchObject({
      allowed: false,
      rule: 'remote-missing',
    });
    expect(isAllowedRemote('', true)).toMatchObject({
      allowed: false,
      rule: 'remote-missing',
    });
  });

  it('refuses a LAN address when allowLan is not set', () => {
    // Act
    const check = isAllowedRemote(LAN_ADDRESS, false);

    // Assert
    expect(check).toMatchObject({
      allowed: false,
      rule: 'remote-not-loopback',
    });

    // The positive control: the one option that should change this
    // answer does change it.
    expect(isAllowedRemote(LAN_ADDRESS, true)).toEqual({ allowed: true });
  });

  it('refuses a public address when allowLan is not set', () => {
    // Act + Assert
    expect(isAllowedRemote('203.0.113.7', false)).toMatchObject({
      allowed: false,
      rule: 'remote-not-loopback',
    });
  });

  it('refuses an IPv4-mapped LAN address when allowLan is not set', () => {
    // Arrange: how a dual-stack listener reports a LAN peer.
    // Act + Assert
    expect(isAllowedRemote(`::ffff:${LAN_ADDRESS}`, false)).toMatchObject({
      allowed: false,
      rule: 'remote-not-loopback',
    });
  });

  it('refuses an address that merely begins with the loopback octets', () => {
    // Arrange: the prefix test a looser implementation would use reads
    // both of these as loopback. Act + Assert.
    expect(isAllowedRemote('127.0.0.1.evil.example', false)).toMatchObject({
      allowed: false,
      rule: 'remote-not-loopback',
    });
    expect(isAllowedRemote('127.0.0.1.2', false)).toMatchObject({
      allowed: false,
      rule: 'remote-not-loopback',
    });
  });
});

describe('what a spoofed forwarded header changes', () => {
  it('refuses a LAN request whose X-Forwarded-For names loopback', () => {
    // Arrange: the header a caller writes to claim it is local. The
    // check is never handed it - the plugin passes the socket's peer
    // address, which the kernel knows.
    // Act + Assert
    expect(isAllowedRemote(LAN_ADDRESS, false)).toMatchObject({
      allowed: false,
      rule: 'remote-not-loopback',
    });
  });

  it('answers a cross-origin request the same with and without an '
    + 'X-Forwarded-For naming the server', () => {
    // Arrange: identical requests but for the forwarded header.
    const hostile: IncomingHttpHeaders = {
      origin: 'http://attacker.example:5173',
      host: 'localhost:5173',
    };
    const spoofed: IncomingHttpHeaders = {
      ...hostile,
      'x-forwarded-for': '127.0.0.1',
      'x-real-ip': 'localhost',
      forwarded: 'for=127.0.0.1;host=localhost:5173;proto=http',
    };

    // Act
    const plain = isSameOriginRequest(hostile, SERVER);
    const withHeader = isSameOriginRequest(spoofed, SERVER);

    // Assert: byte-identical answers, and both refusals.
    expect(withHeader).toEqual(plain);
    expect(withHeader).toMatchObject({
      allowed: false,
      rule: 'origin-mismatch',
    });
  });

  it('answers a same-origin loopback request the same with and without '
    + 'an X-Forwarded-For naming a public address', () => {
    // Arrange: the spoof cannot condemn a legitimate request either.
    const spoofed: IncomingHttpHeaders = {
      ...SAME_ORIGIN,
      'x-forwarded-for': '203.0.113.7',
    };

    // Act + Assert
    expect(isSameOriginRequest(spoofed, SERVER))
      .toEqual(isSameOriginRequest(SAME_ORIGIN, SERVER));
    expect(isSameOriginRequest(spoofed, SERVER)).toEqual({ allowed: true });
    expect(isAllowedRemote('127.0.0.1', false)).toEqual({ allowed: true });
  });
});

describe('what the same-origin check allows', () => {
  it('allows the dev server page talking to itself', () => {
    // Act + Assert
    expect(isSameOriginRequest(SAME_ORIGIN, SERVER)).toEqual({
      allowed: true,
    });
  });

  it('allows a request whose headers omit the default port', () => {
    // Arrange: a dev server on port 80 is addressed as bare
    // 'localhost', and its page sends 'http://localhost'.
    const server: DevToolsServerOrigin = { protocol: 'http:', port: 80 };
    const headers: IncomingHttpHeaders = {
      origin: 'http://localhost',
      host: 'localhost',
    };

    // Act + Assert
    expect(isSameOriginRequest(headers, server)).toEqual({ allowed: true });

    // The positive control: the same server still refuses another port.
    expect(isSameOriginRequest(SAME_ORIGIN, server)).toMatchObject({
      allowed: false,
      rule: 'host-mismatch',
    });
  });

  it('allows an https dev server addressed over https', () => {
    // Arrange: `vite --https` on the default port.
    const server: DevToolsServerOrigin = { protocol: 'https:', port: 443 };
    const headers: IncomingHttpHeaders = {
      origin: 'https://localhost',
      host: 'localhost',
    };

    // Act + Assert
    expect(isSameOriginRequest(headers, server)).toEqual({ allowed: true });
  });

  it('allows a bracketed IPv6 authority', () => {
    // Arrange: how a browser on the IPv6 loopback addresses the server.
    const headers: IncomingHttpHeaders = {
      origin: 'http://[::1]:5173',
      host: '[::1]:5173',
    };

    // Act + Assert
    expect(isSameOriginRequest(headers, SERVER)).toEqual({ allowed: true });
  });
});

describe('what the remote-address check allows', () => {
  it('allows the IPv4 loopback address', () => {
    // Act + Assert
    expect(isAllowedRemote('127.0.0.1', false)).toEqual({ allowed: true });
  });

  it('allows any address inside 127.0.0.0/8', () => {
    // Arrange: the resolver stub answers on 127.0.0.53 on Linux.
    // Act + Assert
    expect(isAllowedRemote('127.0.0.53', false)).toEqual({ allowed: true });
    expect(isAllowedRemote('127.255.255.254', false)).toEqual({
      allowed: true,
    });
  });

  it('allows the IPv6 loopback address in every spelling', () => {
    // Arrange: what node reports for a loopback peer on an IPv6
    // socket, plus the long form and a zone index.
    // Act + Assert
    expect(isAllowedRemote('::1', false)).toEqual({ allowed: true });
    expect(isAllowedRemote('0:0:0:0:0:0:0:1', false)).toEqual({
      allowed: true,
    });
    expect(isAllowedRemote('[::1]', false)).toEqual({ allowed: true });
    expect(isAllowedRemote('::1%lo0', false)).toEqual({ allowed: true });
  });

  it('allows an IPv4-mapped IPv6 loopback address', () => {
    // Arrange: how a dual-stack listener reports a v4 loopback peer.
    // Act + Assert
    expect(isAllowedRemote('::ffff:127.0.0.1', false)).toEqual({
      allowed: true,
    });
    expect(isAllowedRemote('::FFFF:127.0.0.1', false)).toEqual({
      allowed: true,
    });
  });

  it('allows a LAN address when allowLan is set', () => {
    // Act + Assert
    expect(isAllowedRemote(LAN_ADDRESS, true)).toEqual({ allowed: true });
    expect(isAllowedRemote(`::ffff:${LAN_ADDRESS}`, true)).toEqual({
      allowed: true,
    });
  });
});

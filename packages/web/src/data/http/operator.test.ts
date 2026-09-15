import { describe, expect, it } from 'vitest';

import { OPERATOR } from '../shell';

import { BAD_ENVELOPE } from './envelope';
import { LOCAL_OPERATOR, operatorFromSub, readMeSub } from './operator';

describe('LOCAL_OPERATOR', () => {
  it('deep-equals the fixture OPERATOR', () => {
    expect(LOCAL_OPERATOR).toStrictEqual(OPERATOR);
  });

  it('is a copy rather than the fixture object itself', () => {
    expect(LOCAL_OPERATOR).not.toBe(OPERATOR);
    expect(Object.isFrozen(LOCAL_OPERATOR)).toBe(true);
  });

  it('would fail on a member that drifted (control)', () => {
    expect({ ...LOCAL_OPERATOR, role: 'member' }).not.toStrictEqual(OPERATOR);
  });
});

describe('readMeSub', () => {
  it.each([
    ['null', null],
    ['a string', 'basic:alice'],
    ['an array', [{ ok: true, sub: null }]],
    ['a body without ok', { sub: 'basic:alice' }],
    ['ok other than true', { ok: 'true', sub: 'basic:alice' }],
    ['a missing sub', { ok: true }],
    ['a numeric sub', { ok: true, sub: 7 }],
    ['an empty sub', { ok: true, sub: '' }],
  ])('refuses %s with BAD_ENVELOPE', (_label, body) => {
    expect(() => readMeSub(body, 200)).toThrow(expect.objectContaining({
      code: BAD_ENVELOPE,
      status: 200,
    }));
  });

  it('reads a null sub', () => {
    expect(readMeSub({ ok: true, sub: null }, 200)).toBeNull();
  });

  it('reads a string sub, ignoring any other member', () => {
    expect(readMeSub({ ok: true, sub: 'basic:alice', extra: 1 }, 200)).toBe('basic:alice');
  });
});

describe('operatorFromSub', () => {
  it('answers LOCAL_OPERATOR for a null sub', () => {
    expect(operatorFromSub(null)).toBe(LOCAL_OPERATOR);
  });

  it('names a basic subject after the part following basic:', () => {
    expect(operatorFromSub('basic:alice')).toStrictEqual({
      name: 'alice',
      email: 'basic:alice',
      role: 'owner',
    });
  });

  it('keeps a colon inside a basic name', () => {
    expect(operatorFromSub('basic:ops:night')).toStrictEqual({
      name: 'ops:night',
      email: 'basic:ops:night',
      role: 'owner',
    });
  });

  it('names a basic: subject with nothing after the prefix by the whole sub', () => {
    expect(operatorFromSub('basic:')).toStrictEqual({
      name: 'basic:',
      email: 'basic:',
      role: 'owner',
    });
  });

  it('names a subject of another scheme by the whole sub', () => {
    expect(operatorFromSub('oidc|42')).toStrictEqual({
      name: 'oidc|42',
      email: 'oidc|42',
      role: 'owner',
    });
  });

  it('never answers LOCAL_OPERATOR for a subject', () => {
    expect(operatorFromSub('basic:Local Operator')).not.toBe(LOCAL_OPERATOR);
  });
});

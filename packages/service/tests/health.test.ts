import type { ServiceHandle } from '../lib/express/index.js';

import process from 'node:process';

import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import { createService } from '../lib/express/index.js';

process.env['NODE_ENV'] = 'test';

describe('GET /health', () => {
  let handle: ServiceHandle | undefined;

  afterEach(async () => {
    if (handle) {
      await handle.stop();
      handle = undefined;
    }
  });

  it('returns 200 with { status: "ok" }', async () => {
    handle = await createService({
      serviceId: 'template-service-express',
      register() {},
    });

    const response = await request(handle.app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });
});

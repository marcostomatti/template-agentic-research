import type { ControlConfig, ControlStatusResponse } from './types';
import type { Dependency } from '../../service-core/index.js';
import type { Router as ExpressRouter } from 'express';

import { Router } from 'express';
import { z } from 'zod';

import { controlAuth, controlEnabled } from './middleware';
import { isHealthDetailProvider, isPausableDependency } from './types';
import { aggregateStatus, circuitBreakerState, errorMessage } from './utils';
import { readServiceVersion } from './version';

/**
 * Zod schema for the `:name` route parameter in dependency and client routes.
 *
 * Rejects empty strings — a non-empty string is required. Express routing
 * ensures this param is always a string when the route matches; this schema
 * adds an explicit defence against empty values.
 */
const nameParamSchema = z.string().min(1);

/**
 * Creates and returns an Express `Router` implementing the `/_control` operator
 * interface.
 *
 * All routes are gated first by `controlEnabled` (returns 404 when the control
 * plane is disabled) then by `controlAuth` (returns 403 when the
 * `x-control-token` header does not match `config.secret`). `POST /stop`
 * carries a third gate of its own: it is served only when `config.allowStop`
 * is `true`, and answers 404 otherwise.
 *
 * The version reported by `GET /status` is resolved once at construction
 * time. `config.version` is handed to {@link readServiceVersion} and wins
 * outright when supplied; omitting it leaves the version read from the
 * nearest `package.json` above this module, which is what a normal
 * checkout wants. Resolving here rather than per request keeps the read
 * off the request path and matches `startTime`, the other value this
 * factory fixes for the router's lifetime.
 *
 * @param deps - Array of managed `Dependency` instances registered with the service.
 * @param clients - Array of managed HTTP client `Dependency` instances.
 * @param config - Control plane configuration (`enabled`, `secret`,
 *   `allowStop`, `version`).
 * @param serviceId - Unique identifier for this service, included in the status response.
 * @returns A configured Express `Router` that must be mounted at `/_control` in the
 *   host application.
 */
export function createControlRouter(
  deps: Dependency[],
  clients: Dependency[],
  config: ControlConfig,
  serviceId: string,
): ExpressRouter {
  const router = Router();
  const startTime = Date.now();
  const version = readServiceVersion(config.version);

  router.use(controlEnabled(config.enabled));
  router.use(controlAuth(config.secret));

  /**
   * GET /_control/status
   *
   * Returns the full runtime status for the service, all dependencies, and all
   * HTTP clients. Always responds HTTP 200 — the payload itself conveys health.
   *
   * `detail` is included per dependency when the dependency implements
   * `HealthDetailProvider`. `uptime` is measured in seconds from router
   * creation time.
   */
  router.get('/status', (_req, res) => {
    const dependenciesStatus: ControlStatusResponse['dependencies'] = {};
    for (const dep of deps) {
      const detail = isHealthDetailProvider(dep)
        ? dep.healthDetail()
        : undefined;
      dependenciesStatus[dep.name] = {
        status: dep.status,
        ...(detail !== undefined
          ? { detail }
          : {}),
      };
    }

    const clientsStatus: ControlStatusResponse['clients'] = {};
    for (const client of clients) {
      clientsStatus[client.name] = {
        status: client.status,
        circuitBreaker: circuitBreakerState(client.status),
      };
    }

    const payload: ControlStatusResponse = {
      serviceId,
      status: aggregateStatus(deps, clients),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version,
      dependencies: dependenciesStatus,
      clients: clientsStatus,
    };

    res.status(200).json(payload);
  });

  /**
   * GET /_control/dependencies
   *
   * Returns an array of `{ name, status, detail? }` objects — one per registered
   * dependency. `detail` is included only when the dependency implements
   * `HealthDetailProvider`.
   */
  router.get('/dependencies', (_req, res) => {
    const result = deps.map(dep => {
      const detail = isHealthDetailProvider(dep)
        ? dep.healthDetail()
        : undefined;
      return {
        name: dep.name,
        status: dep.status,
        ...(detail !== undefined
          ? { detail }
          : {}),
      };
    });
    res.status(200).json(result);
  });

  /**
   * POST /_control/dependencies/:name/pause
   *
   * Temporarily pauses the named dependency.
   *
   * **Side effects:** calls `dep.pause()` on the matched dependency instance.
   *
   * - `404` when no dependency matches `:name`.
   * - `400` when the dependency does not implement `pause`.
   * - `500` with `{ error: string }` when `dep.pause()` throws.
   * - `200` with `{ ok: true }` on success.
   */
  router.post('/dependencies/:name/pause', async (req, res) => {
    const nameResult = nameParamSchema.safeParse(req.params['name']);
    if (!nameResult.success) {
      res.status(400).json({ error: 'invalid name parameter' });
      return;
    }
    const dep = deps.find(d => d.name === nameResult.data);
    if (!dep) {
      res.status(404).json({ error: 'dependency not found' });
      return;
    }
    if (!isPausableDependency(dep)) {
      res.status(400).json({ error: 'dependency does not support pause' });
      return;
    }
    try {
      await dep.pause();
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: errorMessage(err) });
    }
  });

  /**
   * POST /_control/dependencies/:name/resume
   *
   * Resumes a previously paused dependency.
   *
   * **Side effects:** calls `dep.resume()` on the matched dependency instance.
   *
   * - `404` when no dependency matches `:name`.
   * - `400` when the dependency does not implement `resume`.
   * - `500` with `{ error: string }` when `dep.resume()` throws.
   * - `200` with `{ ok: true }` on success.
   */
  router.post('/dependencies/:name/resume', async (req, res) => {
    const nameResult = nameParamSchema.safeParse(req.params['name']);
    if (!nameResult.success) {
      res.status(400).json({ error: 'invalid name parameter' });
      return;
    }
    const dep = deps.find(d => d.name === nameResult.data);
    if (!dep) {
      res.status(404).json({ error: 'dependency not found' });
      return;
    }
    if (!isPausableDependency(dep)) {
      res.status(400).json({ error: 'dependency does not support resume' });
      return;
    }
    try {
      await dep.resume();
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: errorMessage(err) });
    }
  });

  /**
   * POST /_control/dependencies/:name/restart
   *
   * Restarts the named dependency by calling `stop()` then `start()` in sequence.
   *
   * **Side effects:** calls `dep.stop()` followed by `dep.start()` on the matched
   * dependency. `start()` is only called when `stop()` resolves successfully.
   *
   * Unlike the pause and resume routes above, this one runs no capability
   * check before acting. `Dependency` declares `stop()` and `start()` as
   * REQUIRED members, where the `pause()`/`resume()` pair those two routes
   * guard on is optional — so every value in `deps` is restartable by
   * construction and a guard here could only ever pass. The service
   * template this package forks carries one, along with a `400 dependency
   * does not support restart` branch that no value type-checking as a
   * `Dependency` can reach; both are deliberately absent here rather than
   * lost in the port. The route still answers 400 for a malformed
   * `:name`, which is the shared parameter check and not a statement
   * about the dependency — so the list below carries no 400 where its
   * two neighbours do.
   *
   * - `404` when no dependency matches `:name`.
   * - `500` with `{ error: string }` when `dep.stop()` or `dep.start()` throws.
   * - `200` with `{ ok: true }` on success.
   */
  router.post('/dependencies/:name/restart', async (req, res) => {
    const nameResult = nameParamSchema.safeParse(req.params['name']);
    if (!nameResult.success) {
      res.status(400).json({ error: 'invalid name parameter' });
      return;
    }
    const dep = deps.find(d => d.name === nameResult.data);
    if (!dep) {
      res.status(404).json({ error: 'dependency not found' });
      return;
    }
    try {
      await dep.stop();
      await dep.start();
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: errorMessage(err) });
    }
  });

  /**
   * POST /_control/clients/:name/reset
   *
   * Resets the named HTTP client by calling `stop()` then `start()`, which
   * clears any stopped state and returns circuit-breaker control to the client.
   *
   * **Side effects:** calls `client.stop()` followed by `client.start()`.
   *
   * - `404` when no client matches `:name`.
   * - `500` with `{ error: string }` when `client.stop()` or `client.start()` throws.
   * - `200` with `{ ok: true }` on success.
   */
  router.post('/clients/:name/reset', async (req, res) => {
    const nameResult = nameParamSchema.safeParse(req.params['name']);
    if (!nameResult.success) {
      res.status(400).json({ error: 'invalid name parameter' });
      return;
    }
    const client = clients.find(c => c.name === nameResult.data);
    if (!client) {
      res.status(404).json({ error: 'client not found' });
      return;
    }
    try {
      await client.stop();
      await client.start();
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: errorMessage(err) });
    }
  });

  /**
   * POST /_control/stop
   *
   * Acknowledges the shutdown request with HTTP 200, then asynchronously
   * triggers the same graceful shutdown path as SIGTERM. The response is sent
   * before the signal is emitted so the caller receives confirmation.
   *
   * Served only when `config.allowStop` opts in. Enabling the control plane
   * is not enough — this is the one route that ends the process, so a config
   * that omits the field keeps every other control route and loses this one.
   *
   * A refusal answers 404 and not 403, the same answer the whole plane gives
   * while `enabled` is `false`: 403 would confirm to a caller already holding
   * a valid token that a shutdown endpoint exists here and is merely switched
   * off, where 404 discloses nothing. The check sits inside the handler
   * rather than skipping the `router.post` registration, so the refusal
   * carries this router's own body rather than whatever the host application
   * answers for an unmatched path.
   *
   * **Side effects:** emits `SIGTERM` to the current process via `setImmediate`,
   * activating any registered `registerShutdown` handlers — only once
   * `allowStop` has opted in.
   *
   * - `404` with `{ error: 'not found' }` when `allowStop` is absent or `false`.
   * - `200` with `{ ok: true }` otherwise, before shutdown begins.
   */
  router.post('/stop', (_req, res) => {
    if (!config.allowStop) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    res.status(200).json({ ok: true });
    setImmediate(() => {
      process.kill(process.pid, 'SIGTERM');
    });
  });

  return router;
}

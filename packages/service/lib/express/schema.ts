import type { SessionVerifier } from './auth';
import type { ControlConfig } from './control/types';
import type { ServiceContext } from './types';
import type { Dependency, ServicePlugin } from '../service-core/index.js';
import type { Application } from 'express';

import { z } from 'zod';

/**
 * Zod schema for the configuration accepted by `createService`.
 *
 * All fields with `.default()` are optional at call-time and will be
 * populated with the stated default when omitted.
 */
export const ServiceConfigSchema = z.object({
  /** Unique identifier for this service — used in logs and health endpoints. */
  serviceId: z.string(),
  /**
   * Route/middleware registration callback.
   * Receives the Express app and a fully-constructed {@link ServiceContext}.
   * May return a `Promise` — `createService` will await it.
   */
  register: z.custom<(app: Application, ctx: ServiceContext) => void | Promise<void>>(),

  /** TCP port the HTTP server listens on. @default 3000 */
  port: z.number().default(3000),
  /**
   * Session verification configuration — exactly one of two forms.
   *
   * `verifier` is the seam form: an application that verifies its own
   * tokens (a session store it owns, or an offline JWKS check) supplies a
   * {@link SessionVerifier}, and `requireAuth`/`optionalAuth` are built
   * over it directly, with no HTTP hop per request. `introspectUrl` plus
   * `introspectSecret` is the RFC 7662 form, where the chassis builds the
   * introspection adapter behind that same seam. When the whole block is
   * omitted, both middleware are no-ops.
   *
   * `verifier` is declared here, and not only on the config interface,
   * because a zod object STRIPS every key it does not declare. An
   * interface-only field type-checks at the call site and is then dropped
   * by this parse, so it reaches `createService` on no path at all and
   * the service boots with passthrough auth — a field that silently
   * disables the guard it was passed to enable. `control.allowStop` and
   * `control.version` below are spelled out for the same reason.
   *
   * All three fields are `.optional()` and the `.refine` is what pairs
   * them, because every half-configured block fails silently at runtime
   * rather than at boot. A block setting `introspectUrl` and forgetting
   * the secret would boot successfully and then 401 every authenticated
   * request forever; a block setting both a verifier and an introspection
   * pair would boot with one of them live and nothing saying which. So
   * the refinement demands exactly one form: a verifier and neither
   * introspection field, or both introspection fields and no verifier.
   *
   * `introspectSecret` is a shared credential between this service and
   * whatever serves the RFC 7662 `/introspect` endpoint, not an end-user
   * token. It comes from the consumer's own environment (an env var) and
   * must NEVER be hardcoded or committed. The 32-byte floor exists
   * because `.min(1)` let a consumer satisfy the schema with a literal
   * like `"x"`, which made the warning purely advisory. Hold any real
   * introspection backend to at least the same bar.
   */
  auth: z.object({
    verifier: z.custom<SessionVerifier>((val) => typeof (val as SessionVerifier | undefined)?.verify === 'function')
      .optional(),
    introspectUrl: z.string().optional(),
    introspectSecret: z.string().min(32)
      .optional(),
  })
    .refine(
      (val) => (val.verifier !== undefined
        ? val.introspectUrl === undefined && val.introspectSecret === undefined
        : val.introspectUrl !== undefined && val.introspectSecret !== undefined),
      { message: 'auth must supply either verifier or both introspectUrl and introspectSecret, never both forms' },
    )
    .optional(),
  /**
   * CORS configuration.
   * When provided, the CORS middleware allows the listed origins.
   * When omitted, cross-origin requests are denied (`origin: false`).
   */
  cors: z.object({ origins: z.array(z.string()) }).optional(),
  /**
   * Rate-limiting configuration applied globally via `express-rate-limit`.
   * When omitted, defaults to 100 requests per 60 s window.
   */
  rateLimit: z.object({ max: z.number(), windowMs: z.number() }).optional(),
  /**
   * Request-body parser configuration.
   * When omitted, defaults to `'1mb'` limit.
   */
  body: z.object({ limit: z.string() }).optional(),
  /**
   * Graceful-shutdown configuration.
   * When omitted, a 10 s drain timeout is used.
   */
  shutdown: z.object({ drainTimeout: z.number() }).optional(),
  /**
   * Managed dependencies started before `register` is called and stopped
   * (in reverse order) when `stop()` is invoked.
   * @default []
   */
  dependencies: z.custom<Dependency[]>().default(() => []),
  /**
   * HTTP clients managed alongside regular dependencies.
   * Accessible via `ServiceContext.clients.get(client)`.
   * @default []
   */
  clients: z.custom<Dependency[]>().default(() => []),
  /**
   * Service plugins applied in array order after middleware and built-in
   * routes but before `register`.
   *
   * Each plugin's `register` method receives `{ app, ...ctx }` — the Express
   * application merged with the full {@link ServiceContext} — so plugins can
   * mount routes and access `ctx.logger`, `ctx.deps`, etc.
   * @default []
   */
  plugins: z.custom<ServicePlugin<{ app: Application } & ServiceContext>[]>().default(() => []),
  /**
   * Operator control-plane configuration.
   * When enabled, mounts `/_control/*` routes protected by `secret`.
   * See {@link ControlConfig} for field descriptions.
   *
   * `allowStop` gates the destructive `POST /_control/stop` route and
   * defaults to `false`, so a config that omits it keeps every other
   * control route and loses that one. It is declared here as well as on
   * {@link ControlConfig} because this object strips the keys it does
   * not declare: without it, a consumer setting `allowStop: true` would
   * type-check against the interface and then have the field dropped
   * before the router ever sees it.
   *
   * `version` is declared here for that same reason. It overrides the
   * `package.json` lookup the control plane otherwise performs, and the
   * deployment it exists for — a bundle with no `package.json` above the
   * module — reaches the router through this object like any other, so
   * leaving it undeclared would strip the field on the only path that
   * needs it. It carries no default: absent means "read the file".
   */
  control: z.object({
    enabled: z.boolean(),
    secret: z.string(),
    allowStop: z.boolean().default(false),
    version: z.string().optional(),
  })
    .refine(
      (val) => !val.enabled || val.secret.length > 0,
      { message: 'control.secret must be a non-empty string when the control plane is enabled', path: ['secret'] },
    )
    .optional() as z.ZodOptional<z.ZodType<ControlConfig>>,
});

/** Raw (call-time) input shape — all defaulted fields are optional. */
export type ServiceConfig = z.input<typeof ServiceConfigSchema>;
/** Resolved (post-parse) shape — all defaulted fields are present. */
export type ResolvedServiceConfig = z.output<typeof ServiceConfigSchema>;

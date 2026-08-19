export { createService } from './create-service';
export {
  buildRequireAuth,
  buildOptionalAuth,
  createIntrospectVerifier,
  getSession,
  passthroughMiddleware,
} from './auth';
export type { SessionClaims, SessionVerifier } from './auth';
export type { ServiceConfig, ResolvedServiceConfig } from './schema';
export type { ServiceHandle, ServiceContext, ClientsMap } from './types';
export { createDependency, createHttpClient } from '../service-core/index.js';
export type { Dependency, TypedDependency, DepsMap, TypedClient, ServicePlugin } from '../service-core/index.js';
export type {
  ControlConfig,
  DependencyControlStatus,
  ClientControlStatus,
  ControlStatusResponse,
  PausableDependency,
  RestartableDependency,
  HealthDetailProvider,
} from './control/types';
export { isPausableDependency, isRestartableDependency, isHealthDetailProvider } from './control/types';

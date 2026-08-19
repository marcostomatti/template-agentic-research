// Public exports for lib/service-core

export { createDependency } from './dependency';
export type { CreateDependencyOpts, CreateTypedDependencyOpts } from './dependency';
export type { Dependency, DependencyStatus, TypedDependency, InferInstance, DepsMap } from './types';

export { createHttpClient } from './http-client';
export { CircuitOpenError } from './circuit-breaker';
export type { TypedClient, ClientsMap, HttpClientOpts, RetryConfig, CircuitBreakerConfig } from './types';

export { createServiceLogger } from './logger';
export type { Logger, LoggerOptions, ServiceLogger } from './logger';
export type { ServicePlugin } from './types';

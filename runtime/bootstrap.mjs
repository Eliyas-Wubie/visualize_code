import preload from './preload.cjs';

// Top-level await connects local telemetry before the entry file can log or fail immediately.
await preload.ready;

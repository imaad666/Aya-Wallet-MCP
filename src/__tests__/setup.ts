import dotenv from 'dotenv';

// Declare Jest types for TypeScript
declare global {
  var jest: any;
}

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock environment variables for testing
process.env.HEDERA_NETWORK = 'testnet';
process.env.HEDERA_OPERATOR_ID = '0.0.123456';
process.env.HEDERA_OPERATOR_KEY = 'test-private-key';
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.OPENAI_API_URL = 'https://api.comput3.ai/v1';
process.env.SAUCERSWAP_API_URL = 'https://api.saucerswap.finance';
process.env.SAUCERSWAP_ROUTER_ADDRESS = '0x0000000000000000000000000000000000000000';
process.env.JWT_SECRET = 'test-jwt-secret-32-characters-long';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long';
process.env.LOG_LEVEL = 'error';
process.env.NODE_ENV = 'test';

// Global test timeout
if (typeof globalThis.jest !== 'undefined') {
  globalThis.jest.setTimeout(30000);
}

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: typeof globalThis.jest !== 'undefined' ? globalThis.jest.fn() : console.log,
  debug: typeof globalThis.jest !== 'undefined' ? globalThis.jest.fn() : console.debug,
  info: typeof globalThis.jest !== 'undefined' ? globalThis.jest.fn() : console.info,
  warn: typeof globalThis.jest !== 'undefined' ? globalThis.jest.fn() : console.warn,
  error: typeof globalThis.jest !== 'undefined' ? globalThis.jest.fn() : console.error,
}; 
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Global test setup
beforeAll(() => {
  // Setup global test environment
  process.env.NODE_ENV = 'test';
  
  // Mock console methods in test environment
  if (process.env.NODE_ENV === 'test') {
    global.console = {
      ...console,
      // Uncomment to suppress console.log in tests
      // log: vi.fn(),
      // warn: vi.fn(),
      // error: vi.fn(),
    };
  }
});

afterAll(() => {
  // Global cleanup
});

beforeEach(() => {
  // Setup before each test
});

afterEach(() => {
  // Cleanup after each test
  cleanup();
});

// Mock WebSocket for tests
global.WebSocket = class MockWebSocket {
  constructor(url: string) {
    this.url = url;
    this.readyState = 1; // OPEN
  }
  
  url: string;
  readyState: number;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    // Mock send implementation
  }
  
  close(code?: number, reason?: string) {
    // Mock close implementation
  }
  
  addEventListener(type: string, listener: EventListener) {
    // Mock addEventListener implementation
  }
  
  removeEventListener(type: string, listener: EventListener) {
    // Mock removeEventListener implementation
  }
  
  dispatchEvent(event: Event): boolean {
    return true;
  }
};

// Mock fetch for tests
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});


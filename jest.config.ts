import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/jest/__mocks__/styleMock.js',
    '^lucide-react$': '<rootDir>/jest/__mocks__/lucide-react.js',
    '^recharts$': '<rootDir>/jest/__mocks__/recharts.js',
  },
  transform: {
    '^.+\\.tsx?$': '<rootDir>/jest/transform.cjs',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
};

export default config;

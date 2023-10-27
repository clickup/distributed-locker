"use strict";
module.exports = {
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  testTimeout: 120000,
  clearMocks: true,
  restoreMocks: true,
  forceExit: true,
  transform: {
    "\\.ts$": "ts-jest",
  },
};

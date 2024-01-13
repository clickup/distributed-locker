"use strict";
module.exports = {
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  clearMocks: true,
  restoreMocks: true,
  ...(process.env.IN_JEST_PROJECT ? {} : { forceExit: true }),
  transform: {
    "\\.ts$": "ts-jest",
  },
  ...(process.env["IN_JEST_PROJECT"]
    ? {}
    : { testTimeout: 120000, forceExit: true }),
};

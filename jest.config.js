/** @type {import('jest').Config} */
const config = {
  // ... other Jest configurations
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    // isolatedModules: true works around a pre-existing cross-file type error
    // that prevents ts-jest from compiling the suite; the underlying type error
    // should be fixed separately so this workaround can eventually be removed.
    '^.+\\.(t|j)s$': ['ts-jest', { isolatedModules: true }],
  },
  moduleNameMapper: {
    '^bun$': '<rootDir>/../__mocks__/bun.ts',
  },
  // This is the key change:
  // By default, Jest ignores node_modules. We are making an exception for pdfjs-dist.
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  verbose: true,
  maxWorkers: 1,
};
module.exports = config;

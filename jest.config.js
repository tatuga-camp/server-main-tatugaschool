/** @type {import('jest').Config} */
const config = {
  // ... other Jest configurations
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
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

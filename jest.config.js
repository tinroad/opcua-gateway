module.exports = {
  testEnvironment: 'node',
  verbose: false,
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__mocks__/'
  ],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  moduleNameMapper: {
    '^node-opcua$': '<rootDir>/src/__mocks__/node-opcua.js'
  }
}; 
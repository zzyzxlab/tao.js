module.exports = {
  collectCoverageFrom: [
    "src/**/*.{js,jsx}",
    "!**/*.story.{js,jsx}",
    "!**/node_modules/**",
    "!**/docs/**",
    "!config/**/*.js",
    "!lib/**",
    "!test/**"
  ],
  testMatch: [
    "**/test/**/*.spec.js",
    "**/test/**/*.test.js"
  ],
  passWithNoTests: true,
  coverageReporters: [
    "html"
  ],
  coverageDirectory: "packages/docs/src/content/coverage",
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "example.js"
  ],
  transform: {
    "^.+\\.(js|jsx)$": [
      "babel-jest",
      {
        "presets": [
          [
            "@babel/preset-env",
            {
              "targets": {
                "node": "current"
              }
            }
          ],
          "@babel/preset-react"
        ]
      }
    ]
  },
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    customExportConditions: ["node", "node-addons"]
  },
  // Setup files for Jest
  setupFilesAfterEnv: [
    require('path').resolve(__dirname, 'config/setup.js'),
    require('path').resolve(__dirname, 'config/react-setup.js')
  ],
  // Restore Jest 27 API for compatibility
  globals: {
    "jest": {
      "restoreMocks": false,
      "clearMocks": false,
      "resetMocks": false
    }
  },
  // Fix coverage collection for Jest 30
  collectCoverage: false,
  coverageProvider: "v8",
  transformIgnorePatterns: [
    "node_modules/(?!(cheerio|enzyme|enzyme-to-json|@babel)/)"
  ],
  moduleNameMapper: {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": require('path').resolve(__dirname, 'config/__mocks__/fileMock.js'),
    "\\.(css|less)$": "identity-obj-proxy"
  }
};


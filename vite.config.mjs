// vite.config.mjs
import { defineConfig } from 'vite'
import obfuscator from 'vite-plugin-javascript-obfuscator'

export default defineConfig({
  plugins: [
    obfuscator({
      compact: true,
      selfDefending: true,
      debugProtection: true,
      debugProtectionInterval: 1500,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.7,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.3,
      stringArray: true,
      stringArrayEncoding: ['base64', 'rc4'],
      stringArrayIndexShift: true,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      stringArrayThreshold: 0.85,
      splitStrings: true,
      splitStringsChunkLength: 6,
      numbersToExpressions: true,
      transformObjectKeys: false,
      simplify: false,
      identifierNamesGenerator: 'mangled',
      renameGlobals: false,
      reservedNames: [
        '^_',
        '^secret',
        '^token',
        '^api',
        '^auth',
        '^password',
        '^crypto'
      ],
      reservedStrings: [
        'token',
        'secret',
        'api',
        'key',
        'password',
        'auth'
      ],
      seed: 12345
    })
  ]
})

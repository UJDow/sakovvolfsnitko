// vite.config.mjs
import { defineConfig } from 'vite';
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';

export default defineConfig({
  plugins: [
    obfuscatorPlugin({
      // Базовые настройки
      compact: true,
      selfDefending: true,
      debugProtection: true,
      debugProtectionInterval: 1500,
      
      // Запутывание логики
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.7,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.3,
      
      // Работа со строками
      stringArray: true,
      stringArrayEncoding: ['base64', 'rc4'], // Двойное кодирование
      stringArrayIndexShift: true,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      stringArrayThreshold: 0.85,
      splitStrings: true,
      splitStringsChunkLength: 6,
      
      // Преобразование данных
      numbersToExpressions: true,
      transformObjectKeys: false, // Опасная опция отключена
      simplify: false,
      
      // Безопасное переименование
      identifierNamesGenerator: 'mangled', // Безопаснее hexadecimal
      renameGlobals: false, // Критически важная опция отключена
      renameProperties: false, // Экспериментальная опция отключена
      
      // Защита важных идентификаторов
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
      
      // Безопасная целевая среда
      target: 'browser-safe', // Оптимизировано для браузеров
      
      // Дополнительные защиты
      disableConsoleOutput: false,
      seed: 12345 // Фиксированное зерно для воспроизводимости
    })
  ]
});
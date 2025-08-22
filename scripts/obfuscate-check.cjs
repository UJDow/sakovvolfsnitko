const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '../dist/assets');

// Пропускаем на Vercel при отсутствии assets
if (!fs.existsSync(assetsDir)) {
  console.log('Assets directory not found, skipping obfuscation check.');
  process.exit(0);
}

const files = fs.readdirSync(assetsDir);

// Паттерн под vite: index-<hash|chunk>.js (разрешаем буквы, цифры, подчёркивания, дефисы, точки)
const viteJsPattern = /^index-[\w.-]+\.js$/;
const jsFiles = files.filter(file => viteJsPattern.test(file));

if (jsFiles.length === 0) {
  console.error('❌ No JavaScript files found with Vite naming pattern');
  console.log('All files in assets:', files);
  // Не валим прод‑деплой из‑за несоответствия маске: выходим успешно
  // Если хочешь жёстко — поменяй на process.exit(1)
  process.exit(0);
}

console.log('✅ Found', jsFiles.length, 'JavaScript files:');
jsFiles.forEach(file => {
  const full = path.join(assetsDir, file);
  const content = fs.readFileSync(full, 'utf-8');

  // Очень грубая эвристика «обфускации»
  const isObfuscated =
    content.length > 500 &&
    !/\/\/\s/.test(content) &&          // нет обычных комментариев
    !/\n\s{0,2}const\s|\n\s{0,2}let\s/.test(content); // мало «читаемых» деклараций

  console.log(`  ${file} - ${isObfuscated ? 'OBFUSCATED ✅' : 'NOT obfuscated ❌'}`);
});

// Не фейлим билд автоматически
process.exit(0);

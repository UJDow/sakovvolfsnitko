const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '../dist/assets');

// Проверяем существование директории assets
if (!fs.existsSync(assetsDir)) {
  console.log('Assets directory not found, skipping obfuscation check.');
  process.exit(0); // Не ошибка, просто выходим
}

// Ищем JS-файлы по шаблону Vite ([name]-[hash].js)
const files = fs.readdirSync(assetsDir);
const jsFiles = files.filter(file => 
  /^[a-zA-Z0-9]+-[a-zA-Z0-9]{8}\.js$/.test(file)
);

if (jsFiles.length === 0) {
  console.error('❌ No JavaScript files found with Vite naming pattern');
  console.log('All files in assets:', files);
  process.exit(1);
}

console.log('✅ Found', jsFiles.length, 'JavaScript files:');
jsFiles.forEach(file => {
  const content = fs.readFileSync(path.join(assetsDir, file), 'utf-8');
  const isObfuscated = content.includes('function') && 
                       content.length > 500 && 
                       !content.includes('//');
  
  console.log(`  ${file} - ${isObfuscated ? 'OBFUSCATED ✅' : 'NOT obfuscated ❌'}`);
});

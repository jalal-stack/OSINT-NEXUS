const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// remove showMaltegoInfo state
content = content.replace(/const \[showMaltegoInfo, setShowMaltegoInfo\] = useState\(false\);\n/, '');

// remove exportToMaltego function entirely
content = content.replace(/  const exportToMaltego[^]*?addLog\("CSV экспорт для Maltego успешно загружен\."\);\n  };\n/, '');

// remove the Maltego button
const buttonRegex = /<button\s+onClick=\{\(\) => setShowMaltegoInfo\(true\)\}[^]*?Maltego Integration\n\s+<\/button>\n/;
content = content.replace(buttonRegex, '');

// remove the Maltego modal
const modalRegex = /\{\/\* Maltego Info Modal \*\/\}[^]*?<\/AnimatePresence>\n/;
content = content.replace(modalRegex, '');

fs.writeFileSync('src/App.tsx', content);

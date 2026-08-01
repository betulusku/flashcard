// Merges the per-chunk definition files back into src/data/vocabulary.json and
// reports anything still missing or unusable.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const vocabularyPath = path.join(root, 'src/data/vocabulary.json');
const words = JSON.parse(fs.readFileSync(vocabularyPath, 'utf8'));
const outDir = path.join(__dirname, 'out');

// Every field an out file carries besides the id is merged onto the word, so
// the same pipeline serves definitions and their Turkish translations.
const fields = new Map();
const files = fs.existsSync(outDir) ? fs.readdirSync(outDir).filter(name => name.endsWith('.json')).sort() : [];
files.forEach(name => {
  const entries = JSON.parse(fs.readFileSync(path.join(outDir, name), 'utf8'));
  entries.forEach(entry => {
    if (!entry || !entry.id) return;
    const {id, ...rest} = entry;
    const clean = {};
    Object.keys(rest).forEach(key => {
      if (typeof rest[key] === 'string' && rest[key].trim()) clean[key] = rest[key].trim();
    });
    if (Object.keys(clean).length) fields.set(String(id), clean);
  });
});

const missing = [];
const suspicious = [];
const merged = words.map(word => {
  const update = fields.get(String(word.id));
  if (!update) {
    missing.push(word);
    return word;
  }
  Object.entries(update).forEach(([key, value]) => {
    if (value.length > 160) suspicious.push(`${word.en}: ${key} too long (${value.length})`);
    if (/["“”]/.test(value)) suspicious.push(`${word.en}: ${key} contains quotes`);
  });
  return {...word, ...update};
});

// One record per line: small enough to bundle, still readable in a diff.
if (!process.argv.includes('--check')) {
  const body = merged.map(word => JSON.stringify(word)).join(',\n');
  fs.writeFileSync(vocabularyPath, `[\n${body}\n]\n`);
}

console.log(`files: ${files.length}, updated: ${fields.size}, words: ${words.length}`);
console.log(`missing: ${missing.length}`);
if (missing.length) console.log(missing.slice(0, 40).map(word => `${word.id} ${word.en}`).join('\n'));
if (suspicious.length) console.log(`suspicious: ${suspicious.length}\n${suspicious.slice(0, 40).join('\n')}`);

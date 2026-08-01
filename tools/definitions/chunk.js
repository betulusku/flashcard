// Splits the vocabulary into review-sized chunks so definitions can be written
// for every entry, then merged back with merge.js.
const fs = require('fs');
const path = require('path');

const CHUNK_SIZE = Number(process.argv[2] || 192);
const root = path.join(__dirname, '..', '..');
const words = JSON.parse(fs.readFileSync(path.join(root, 'src/data/vocabulary.json'), 'utf8'));
const chunkDir = path.join(__dirname, 'chunks');

fs.rmSync(chunkDir, {recursive: true, force: true});
fs.mkdirSync(chunkDir, {recursive: true});

const chunks = [];
for (let index = 0; index < words.length; index += CHUNK_SIZE) {
  chunks.push(words.slice(index, index + CHUNK_SIZE));
}

chunks.forEach((chunk, index) => {
  const name = `chunk-${String(index + 1).padStart(2, '0')}.json`;
  const payload = chunk.map(word => ({
    id: word.id,
    en: word.en,
    tr: word.tr,
    pos: word.pos,
    level: word.level,
    example: word.example,
    definition: word.definition,
  }));
  fs.writeFileSync(path.join(chunkDir, name), JSON.stringify(payload, null, 1) + '\n');
});

console.log(`${words.length} words -> ${chunks.length} chunks of up to ${CHUNK_SIZE}`);

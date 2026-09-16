// Extract text from the Anasuya patient PDFs so they can be read/parsed.
//
// Usage:
//   node scripts/extract-pdf-text.mjs                  # uses the default dataset folder
//   node scripts/extract-pdf-text.mjs "path/to/folder" # or pass any folder with PDFs
//
// Writes a .txt file next to each PDF and prints text lengths.

import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse/lib/pdf-parse.js';

const FOLDER = process.argv[2] ?? 'C:\\Users\\advantix-user-001\\Documents\\Niraiva\\dataset\\patined_data';

if (!fs.existsSync(FOLDER)) {
  console.error(`Folder not found: ${FOLDER}`);
  process.exit(1);
}

const files = fs.readdirSync(FOLDER).filter(f => f.toLowerCase().endsWith('.pdf'));

if (files.length === 0) {
  console.error(`No PDF files in: ${FOLDER}`);
  process.exit(1);
}

for (const file of files) {
  const filePath = path.join(FOLDER, file);
  try {
    const buf = fs.readFileSync(filePath);
    const data = await pdf(buf);
    const txtPath = filePath.replace(/\.pdf$/i, '.txt');
    fs.writeFileSync(txtPath, data.text, 'utf8');
    console.log(`✔ ${file} -> ${path.basename(txtPath)} (${data.text.length} chars, ${data.numpages} pages)`);
  } catch (err) {
    console.error(`✘ ${file}: ${err.message}`);
  }
}

console.log('\nDone. Paste the .txt contents here or tell me to read them.');
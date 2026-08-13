import fs from 'fs';
import path from 'path';

const brainDir = 'C:/Users/Maddy/.gemini/antigravity-ide/brain';
const files = fs.readdirSync(brainDir);

const folders = [];
for (const file of files) {
  const fullPath = path.join(brainDir, file);
  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    folders.push({ name: file, mtime: stat.mtime });
  }
}

folders.sort((a, b) => b.mtime - a.mtime);
console.log('Top 15 modified folders in brain:');
console.log(JSON.stringify(folders.slice(0, 15), null, 2));

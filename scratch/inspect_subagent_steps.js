import fs from 'fs';
import path from 'path';

const brainDir = 'C:/Users/Maddy/.gemini/antigravity-ide/brain';
const folders = fs.readdirSync(brainDir).filter(f => f !== '10b2aa00-d46b-4393-82f6-4b372d542c9a');

// Sort folders by creation/mtime to find the latest subagent folder
const enrichedFolders = folders.map(f => {
  const stat = fs.statSync(path.join(brainDir, f));
  return { name: f, mtime: stat.mtime };
}).sort((a, b) => b.mtime - a.mtime);

if (enrichedFolders.length === 0) {
  console.log('No subagent folders found!');
  process.exit(0);
}

const latestFolder = enrichedFolders[0].name;
console.log('Latest subagent folder:', latestFolder);

const fullLogPath = path.join(brainDir, latestFolder, '.system_generated/logs/transcript_full.jsonl');
if (!fs.existsSync(fullLogPath)) {
  console.log('Transcript file not found at:', fullLogPath);
  process.exit(0);
}

const logLines = fs.readFileSync(fullLogPath, 'utf-8').split('\n');
console.log('Scanning transcript lines...');

for (const line of logLines) {
  if (!line) continue;
  try {
    const data = JSON.parse(line);
    // Print all steps where browser captured console logs
    if (data.type === 'CAPTURE_BROWSER_CONSOLE_LOGS' || line.includes('console') || line.includes('log')) {
      console.log(`\n=== Step ${data.step_index} (${data.type}) ===`);
      console.log('Content:', data.content);
    }
  } catch (err) {
  }
}

import fs from 'fs';
import path from 'path';

const brainDir = 'C:/Users/Maddy/.gemini/antigravity-ide/brain';
const folders = fs.readdirSync(brainDir).filter(f => f !== '10b2aa00-d46b-4393-82f6-4b372d542c9a');

const enrichedFolders = folders.map(f => {
  const logFile = path.join(brainDir, f, '.system_generated/logs/transcript_full.jsonl');
  if (fs.existsSync(logFile)) {
    const stat = fs.statSync(logFile);
    return { name: f, mtime: stat.mtime, path: logFile };
  }
  return null;
}).filter(Boolean).sort((a, b) => b.mtime - a.mtime);

if (enrichedFolders.length === 0) {
  console.log('No subagent transcripts found!');
  process.exit(0);
}

const latestLog = enrichedFolders[0];
console.log('Latest subagent transcript:', latestLog.name, 'modified at:', latestLog.mtime);

const lines = fs.readFileSync(latestLog.path, 'utf-8').split('\n');
for (const line of lines) {
  if (!line) continue;
  try {
    const data = JSON.parse(line);
    // Print all browser console logs tool responses
    if (data.type === 'CAPTURE_BROWSER_CONSOLE_LOGS' || data.type === 'BROWSER_CONSOLE_LOGS') {
      console.log(`\n=== STEP ${data.step_index} (${data.type}) ===`);
      console.log('Content:', data.content);
    }
  } catch (err) {}
}

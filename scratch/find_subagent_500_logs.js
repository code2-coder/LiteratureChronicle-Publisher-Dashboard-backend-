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
console.log('Reading logs from:', latestLog.name);

const logLines = fs.readFileSync(latestLog.path, 'utf-8').split('\n');

for (const line of logLines) {
  if (!line) continue;
  try {
    const data = JSON.parse(line);
    const contentStr = typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
    if (contentStr.includes('500') || contentStr.includes('AxiosError') || contentStr.includes('Failed to load resource')) {
      console.log(`\n=== STEP ${data.step_index} (${data.type}) ===`);
      console.log(data.content);
    }
  } catch (err) {}
}

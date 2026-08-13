import fs from 'fs';
import path from 'path';

const brainDir = 'C:/Users/Maddy/.gemini/antigravity-ide/brain';
const folders = fs.readdirSync(brainDir).filter(f => f !== '10b2aa00-d46b-4393-82f6-4b372d542c9a');

const enrichedFolders = folders.map(f => {
  const stat = fs.statSync(path.join(brainDir, f));
  return { name: f, mtime: stat.mtime };
}).sort((a, b) => b.mtime - a.mtime);

if (enrichedFolders.length === 0) {
  console.log('No subagent folders found!');
  process.exit(0);
}

const latestFolder = enrichedFolders[0].name;
console.log('Inspecting subagent folder:', latestFolder);

const fullLogPath = path.join(brainDir, latestFolder, '.system_generated/logs/transcript_full.jsonl');
const lines = fs.readFileSync(fullLogPath, 'utf-8').split('\n');

for (const line of lines) {
  if (!line) continue;
  try {
    const data = JSON.parse(line);
    console.log(`Step ${data.step_index}: type=${data.type}, source=${data.source}`);
    if (data.tool_calls) {
      console.log('  Tool calls:', data.tool_calls.map(tc => tc.name));
    }
  } catch (err) {}
}

import fs from 'fs';

const filePath = 'C:/Users/Maddy/.gemini/antigravity-ide/brain/10b2aa00-d46b-4393-82f6-4b372d542c9a/.system_generated/logs/transcript_full.jsonl';
const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

for (const line of lines) {
  if (!line) continue;
  try {
    const data = JSON.parse(line);
    if (data.step_index === 122) {
      console.log('--- Subagent result content length:', data.content.length);
      console.log('Last 1000 characters of content:');
      console.log(data.content.substring(data.content.length - 1000));
    }
  } catch (err) {
  }
}

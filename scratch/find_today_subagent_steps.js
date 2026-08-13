import fs from 'fs';

const filePath = 'C:/Users/Maddy/.gemini/antigravity-ide/brain/10b2aa00-d46b-4393-82f6-4b372d542c9a/.system_generated/logs/transcript_full.jsonl';
const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

for (const line of lines) {
  if (!line) continue;
  try {
    const data = JSON.parse(line);
    if (data.step_index >= 170 && data.step_index <= 220) {
      console.log(`\n=== STEP ${data.step_index} (${data.type}) ===`);
      if (data.content.length > 500) {
        console.log(data.content.substring(0, 500) + '... [TRUNCATED]');
      } else {
        console.log(data.content);
      }
    }
  } catch (err) {}
}

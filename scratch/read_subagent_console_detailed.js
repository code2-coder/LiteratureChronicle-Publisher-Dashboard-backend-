import fs from 'fs';

const filePath = 'C:/Users/Maddy/.gemini/antigravity-ide/brain/10b2aa00-d46b-4393-82f6-4b372d542c9a/.system_generated/logs/transcript_full.jsonl';

const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

for (const line of lines) {
  if (!line) continue;
  try {
    const data = JSON.parse(line);
    // Look for tool calls or tool responses in the transcript
    if (data.type === 'CAPTURE_BROWSER_CONSOLE_LOGS' || data.type === 'BROWSER_SUBAGENT') {
      console.log(`\n=== STEP ${data.step_index} (${data.type}) ===`);
      console.log(data.content);
    }
    // Also scan for any step that contains console output
    if (line.includes('console.error') || line.includes('Console logs:') || line.includes('console.log') || line.includes('uncaught')) {
      if (data.step_index !== 122) { // Skip the final summary
        console.log(`\n=== STEP ${data.step_index} has console keywords ===`);
        console.log(data.content.substring(0, 1000));
      }
    }
  } catch (err) {
  }
}

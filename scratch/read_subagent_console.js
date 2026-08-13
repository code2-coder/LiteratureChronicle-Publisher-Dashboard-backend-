import fs from 'fs';

const filePath = 'C:/Users/Maddy/.gemini/antigravity-ide/brain/10b2aa00-d46b-4393-82f6-4b372d542c9a/.system_generated/logs/transcript_full.jsonl';

const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

for (const line of lines) {
  if (!line) continue;
  try {
    const data = JSON.parse(line);
    if (data.step_index === 122) {
      console.log('--- FOUND SUBAGENT RESPONSE ---');
      const content = data.content;
      
      // Let's search for Console Logs or capture_browser_console_logs in content
      const searchStr = 'capture_browser_console_logs';
      let idx = content.indexOf(searchStr);
      while (idx !== -1) {
        console.log(`\nFound capture_browser_console_logs at index ${idx}`);
        const snippet = content.substring(idx, idx + 2000);
        console.log('Snippet:\n', snippet);
        idx = content.indexOf(searchStr, idx + 1);
      }
    }
  } catch (err) {
    // Ignore invalid JSON lines
  }
}

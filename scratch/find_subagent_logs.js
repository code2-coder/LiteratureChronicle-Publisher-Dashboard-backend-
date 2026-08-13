import fs from 'fs';
import path from 'path';

const brainDir = 'C:/Users/Maddy/.gemini/antigravity-ide/brain';

try {
  const folders = fs.readdirSync(brainDir);
  console.log('Brain subdirectories:', folders);
  
  for (const folder of folders) {
    if (folder === '10b2aa00-d46b-4393-82f6-4b372d542c9a') continue; // Skip main conversation
    
    const logsDir = path.join(brainDir, folder, '.system_generated/logs');
    const fullLogPath = path.join(logsDir, 'transcript_full.jsonl');
    
    if (fs.existsSync(fullLogPath)) {
      console.log(`\nFound transcript in folder: ${folder}`);
      const logLines = fs.readFileSync(fullLogPath, 'utf-8').split('\n');
      for (const line of logLines) {
        if (!line) continue;
        const data = JSON.parse(line);
        if (data.type === 'CAPTURE_BROWSER_CONSOLE_LOGS' && data.status === 'DONE') {
          console.log(`--- Console Logs from folder ${folder} ---`);
          console.log(data.content);
        }
      }
    }
  }
} catch (err) {
  console.error('Error listing folders:', err);
}

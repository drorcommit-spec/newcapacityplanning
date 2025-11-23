import fs from 'fs/promises';

async function recoverDatabase() {
  try {
    console.log('Reading corrupted database...');
    const content = await fs.readFile('database.json', 'utf-8');
    
    // Try to find the first valid JSON object
    let startIndex = content.indexOf('{');
    let braceCount = 0;
    let endIndex = -1;
    
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') braceCount--;
      
      if (braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
    
    if (endIndex > 0) {
      const validJson = content.substring(startIndex, endIndex);
      const data = JSON.parse(validJson);
      
      console.log('Valid data recovered:');
      console.log('- Team Members:', data.teamMembers?.length || 0);
      console.log('- Projects:', data.projects?.length || 0);
      console.log('- Allocations:', data.allocations?.length || 0);
      console.log('- History:', data.history?.length || 0);
      
      // Write recovered data
      await fs.writeFile('database.json', JSON.stringify(data, null, 2));
      console.log('✅ Database recovered successfully!');
    } else {
      console.error('❌ Could not find valid JSON structure');
    }
  } catch (error) {
    console.error('❌ Recovery failed:', error.message);
  }
}

recoverDatabase();

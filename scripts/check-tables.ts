import { db } from '../server/db';

async function checkTables() {
  const result: any = await db.execute('SHOW TABLES');
  console.log('Result:', result);
  
  if (Array.isArray(result)) {
    const tables = result.map((t: any) => Object.values(t)[0]) as string[];
    const uploadTables = tables.filter(t => t.includes('upload'));
    
    console.log('Upload相关的表:');
    uploadTables.forEach(t => console.log(`  - ${t}`));
  }
  
  process.exit(0);
}

checkTables();

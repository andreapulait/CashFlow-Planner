import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { affluenti, fiumi } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

console.log('\n=== VERIFICA AFFLUENTI NEL DATABASE ===\n');

// Get all affluenti
const allAffluenti = await db.select().from(affluenti);
console.log(`Totale affluenti: ${allAffluenti.length}`);

// Group by fiume
const byFiume = {};
for (const aff of allAffluenti) {
  if (!byFiume[aff.fiumeId]) byFiume[aff.fiumeId] = [];
  byFiume[aff.fiumeId].push(aff);
}

console.log('\nAffluenti per fiume:');
for (const [fiumeId, affs] of Object.entries(byFiume)) {
  const fiume = await db.select().from(fiumi).where(eq(fiumi.id, parseInt(fiumeId))).limit(1);
  const nomeFiume = fiume[0]?.nome || 'Sconosciuto';
  console.log(`  ${nomeFiume} (ID ${fiumeId}): ${affs.length} affluenti`);
  
  // Show groupId and periodicita
  const groups = {};
  for (const aff of affs) {
    const key = aff.groupId || 'singolo';
    if (!groups[key]) groups[key] = [];
    groups[key].push(aff);
  }
  
  for (const [groupId, groupAffs] of Object.entries(groups)) {
    if (groupId === 'singolo') {
      console.log(`    - ${groupAffs.length} affluenti singoli`);
    } else {
      const first = groupAffs[0];
      console.log(`    - Gruppo ${groupId}: ${groupAffs.length} affluenti, periodicità ${first.periodicita}, durata ${first.durataMesi} mesi`);
    }
  }
}

await connection.end();

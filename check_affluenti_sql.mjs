import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log('\n=== VERIFICA AFFLUENTI NEL DATABASE ===\n');

// Get all affluenti with fiume name
const [affluenti] = await connection.query(`
  SELECT 
    a.id, a.fiumeId, f.nome as fiumeNome, a.importo, a.mese, 
    a.dataAffluente, a.descrizione, a.ricorrente, a.periodicita, 
    a.durataMesi, a.groupId
  FROM affluenti a
  JOIN fiumi f ON a.fiumeId = f.id
  ORDER BY f.nome, a.groupId, a.mese
`);

console.log(`Totale affluenti: ${affluenti.length}\n`);

// Group by fiume and groupId
const byFiume = {};
for (const aff of affluenti) {
  if (!byFiume[aff.fiumeNome]) byFiume[aff.fiumeNome] = {};
  const groupKey = aff.groupId || `singolo_${aff.id}`;
  if (!byFiume[aff.fiumeNome][groupKey]) byFiume[aff.fiumeNome][groupKey] = [];
  byFiume[aff.fiumeNome][groupKey].push(aff);
}

for (const [fiumeNome, groups] of Object.entries(byFiume)) {
  console.log(`\n${fiumeNome}:`);
  for (const [groupKey, affs] of Object.entries(groups)) {
    if (groupKey.startsWith('singolo_')) {
      const aff = affs[0];
      console.log(`  - Singolo: ${aff.importo/100}€ al mese ${aff.mese} (${aff.dataAffluente?.toISOString().slice(0,10)})`);
    } else {
      const first = affs[0];
      console.log(`  - Gruppo ${groupKey}:`);
      console.log(`    Periodicità: ${first.periodicita} mesi, Durata: ${first.durataMesi} mesi`);
      console.log(`    ${affs.length} affluenti da ${first.importo/100}€ = ${(affs.length * first.importo)/100}€ totale`);
      console.log(`    Mesi: ${affs.map(a => a.mese).join(', ')}`);
    }
  }
}

await connection.end();

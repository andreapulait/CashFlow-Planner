import fs from 'fs';
import mysql from 'mysql2/promise';
import 'dotenv/config';

// Read the fixed JSON file
const data = JSON.parse(fs.readFileSync('/home/ubuntu/upload/cashflow-planner-export-fixed.json', 'utf8'));

// User ID for andrea.pula.it
const userId = 360001;

console.log('Starting import...');
console.log(`Fiumi: ${data.data.fiumi.length}`);
console.log(`Affluenti: ${data.data.affluenti.length}`);
console.log(`Reinvestimenti: ${data.data.reinvestimenti.length}`);

// Import fiumi
const fiumeNameToId = new Map();

for (const fiume of data.data.fiumi) {
  console.log(`Creating fiume: ${fiume.nome}`);
  const created = await createFiume({
    userId,
    nome: fiume.nome,
    sorgente: fiume.sorgente,
    rendimento: fiume.rendimento,
    meseInizio: fiume.meseCreazione,
    dataCreazione: new Date(fiume.dataCreazione),
  });
  fiumeNameToId.set(fiume.nome, created.id);
  console.log(`  → Created with ID ${created.id}`);
}

// Import affluenti
for (const affluente of data.data.affluenti) {
  const fiumeId = fiumeNameToId.get(affluente.fiumeNome);
  if (!fiumeId) {
    console.log(`Skipping affluente: fiume ${affluente.fiumeNome} not found`);
    continue;
  }
  
  await createAffluente({
    fiumeId,
    importo: affluente.importo,
    mese: affluente.mese,
    dataAffluente: new Date(affluente.dataAffluente),
    descrizione: affluente.descrizione,
    ricorrente: affluente.periodicita ? true : false,
    periodicita: affluente.periodicita || null,
    durataMesi: null,
    groupId: affluente.groupId || null,
  });
}

console.log(`Imported ${data.data.affluenti.length} affluenti`);

// Import reinvestimenti
for (const reinv of data.data.reinvestimenti) {
  const fiumeSorgenteId = fiumeNameToId.get(reinv.fiumeSorgenteNome);
  if (!fiumeSorgenteId) {
    console.log(`Skipping reinvestimento: fiumeSorgenteNome ${reinv.fiumeSorgenteNome} not found`);
    continue;
  }
  
  const fiumeDestinazioneId = reinv.fiumeDestinazioneNome 
    ? fiumeNameToId.get(reinv.fiumeDestinazioneNome)
    : null;
  
  await createReinvestimento({
    fiumeOrigineId: fiumeSorgenteId,
    fiumeDestinazioneId: fiumeDestinazioneId || null,
    nuovoFiumeNome: reinv.nuovoFiumeNome,
    nuovoFiumeRendimento: reinv.nuovoFiumeRendimento,
    importoFisso: reinv.importoFisso,
    percentuale: reinv.percentuale,
    meseReinvestimento: reinv.mese,
    dataReinvestimento: reinv.dataReinvestimento ? new Date(reinv.dataReinvestimento) : null,
  });
}

console.log(`Imported ${data.data.reinvestimenti.length} reinvestimenti`);

// Import impostazioni
const impostazioni = data.data.impostazioni;
await updateImpostazioni({
  obiettivoMensile: impostazioni.obiettivoMensile,
  orizzonteTemporale: impostazioni.orizzonteTemporale,
  dataInizio: new Date(impostazioni.dataInizio),
  budgetMensileAffluenti: impostazioni.budgetMensileAffluenti,
});

console.log('Import completed successfully!');

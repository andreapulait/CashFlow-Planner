import mysql from "mysql2/promise";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const connection = await mysql.createConnection(connectionString);

console.log("🧹 Cleaning database...");

// Clean affluenti and reinvestimenti
await connection.execute("DELETE FROM affluenti");
await connection.execute("DELETE FROM reinvestimenti");

console.log("✅ Database cleaned");

// Get existing fiumi
let [fiumi] = await connection.execute("SELECT * FROM fiumi ORDER BY id");

if (fiumi.length === 0) {
  console.log("⚠️  No fiumi found. Creating test fiumi...");
  
  // Get first user ID
  const [users] = await connection.execute("SELECT id FROM users LIMIT 1");
  const userId = users.length > 0 ? users[0].id : 1;
  
  // Create test fiumi
  await connection.execute(
    `INSERT INTO fiumi (userId, nome, sorgente, rendimento, meseCreazione, dataCreazione) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, 'Dividendi', 50000, 8, 0, new Date('2026-01-01')]
  );
  
  await connection.execute(
    `INSERT INTO fiumi (userId, nome, sorgente, rendimento, meseCreazione, dataCreazione) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, 'Gestito', 30000, 6, 0, new Date('2026-01-01')]
  );
  
  // Reload fiumi
  [fiumi] = await connection.execute("SELECT * FROM fiumi ORDER BY id");
  console.log("✅ Test fiumi created");
}

console.log(`📊 Found ${fiumi.length} fiumi:`);
fiumi.forEach(f => console.log(`  - ${f.nome} (ID: ${f.id})`));

// Find "Dividendi" and "Gestito" fiumi
const dividendiFiume = fiumi.find(f => f.nome.toLowerCase().includes('divid'));
const gestitoFiume = fiumi.find(f => f.nome.toLowerCase().includes('gest'));

if (!dividendiFiume || !gestitoFiume) {
  console.log("❌ Could not find 'Dividendi' and 'Gestito' fiumi");
  console.log("Using first two fiumi instead...");
}

const fiume1 = dividendiFiume || fiumi[0];
const fiume2 = gestitoFiume || fiumi[1] || fiumi[0];

console.log("\n📝 Creating test affluenti...");

// 1. Create recurring semestral affluenti (12,000€ every 6 months)
// Starting July 2026 (month 6), ending July 2030 (month 54)
// Should create 9 affluenti: months 6, 12, 18, 24, 30, 36, 42, 48, 54
const groupId = `test_${Date.now()}`;
const baseDate = new Date('2026-01-01');

console.log(`\n1️⃣ Creating recurring semestral affluenti for ${fiume1.nome}:`);
console.log(`   - 12,000€ every 6 months`);
console.log(`   - From July 2026 (month 6) to July 2030 (month 54)`);
console.log(`   - Expected: 9 affluenti, 2,000€/month allocated from month 0 to 54`);

for (let i = 0; i < 9; i++) {
  const mese = 6 + (i * 6);
  const date = new Date(baseDate);
  date.setMonth(date.getMonth() + mese);
  
  await connection.execute(
    `INSERT INTO affluenti (fiumeId, importo, mese, dataAffluente, descrizione, ricorrente, periodicita, durataMesi, groupId) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [fiume1.id, 12000, mese, date, `Semestral ${i + 1}`, 1, 6, 60, groupId]
  );
  
  console.log(`   ✓ Month ${mese}: 12,000€`);
}

// 2. Create one-time affluente in July 2026 (month 6)
console.log(`\n2️⃣ Creating one-time affluente for ${fiume2.nome}:`);
console.log(`   - 5,000€ in July 2026 (month 6)`);
console.log(`   - Expected: 5,000€ allocated ONLY in month 6`);

const julyDate = new Date('2026-07-01');
await connection.execute(
  `INSERT INTO affluenti (fiumeId, importo, mese, dataAffluente, descrizione, ricorrente, periodicita, durataMesi, groupId) 
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [fiume2.id, 5000, 6, julyDate, 'Una tantum', 0, null, null, null]
);

console.log(`   ✓ Month 6: 5,000€`);

console.log("\n✅ Test data created successfully!");
console.log("\n📊 Expected Budget Tracker results:");
console.log("   - Months 0-5: 2,000€ (40% of 5,000€ budget) - GREEN");
console.log("   - Month 6 (July 2026): 7,000€ (140% of 5,000€ budget) - RED with 140%");
console.log("   - Months 7-54: 2,000€ (40% of 5,000€ budget) - GREEN");
console.log("   - Months 55-59: 0€ (0% of 5,000€ budget) - GREY");
console.log("\n🌐 Open the app and navigate to 'Apporti' to see the Budget Tracker");

await connection.end();

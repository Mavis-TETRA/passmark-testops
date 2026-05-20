import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';

async function main() {
  const rootDir = process.cwd();
  const dbPath = path.join(rootDir, 'storage', 'passmark.db');
  const migrationPath = path.join(rootDir, 'prisma', 'legacy-sqlite', '0001_init', 'migration.sql');

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const SQL = await initSqlJs();
  const database = fs.existsSync(dbPath)
    ? new SQL.Database(fs.readFileSync(dbPath))
    : new SQL.Database();
  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

  database.run(migrationSql);
  fs.writeFileSync(dbPath, Buffer.from(database.export()));
  database.close();

  console.log(`Legacy SQLite database ready: ${dbPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

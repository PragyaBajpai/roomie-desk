import { Pool, type PoolClient, types } from "pg";
import { SCHEMA_SQL } from "./schema";
import { DEMO_ENQUIRIES, DEMO_FLATMATES } from "./seed";

// Return DATE columns as plain 'YYYY-MM-DD' strings (no timezone drift).
types.setTypeParser(1082, (v: string) => v);

const g = globalThis as unknown as { __roomiePool?: Pool; __roomieReady?: Promise<void> };

function makePool() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL is not set. See README → Environment variables.");
  const isLocal = /localhost|127\.0\.0\.1|\/var\/run|host=\//.test(url);
  return new Pool({
    connectionString: url,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10_000,
  });
}

export function pool(): Pool {
  if (!g.__roomiePool) g.__roomiePool = makePool();
  return g.__roomiePool;
}

/** Creates tables and loads fictional demo data exactly once. */
export function ensureReady(): Promise<void> {
  if (!g.__roomieReady) {
    g.__roomieReady = migrateAndSeed().catch((e) => {
      g.__roomieReady = undefined;
      throw e;
    });
  }
  return g.__roomieReady;
}

async function migrateAndSeed() {
  const client = await pool().connect();
  try {
    await client.query("SELECT pg_advisory_lock(424242)");
    await client.query(SCHEMA_SQL);
    const { rows } = await client.query("SELECT value FROM app_meta WHERE key = 'seeded'");
    if (rows.length === 0) {
      await client.query("BEGIN");
      await seed(client);
      await client.query("INSERT INTO app_meta (key, value) VALUES ('seeded', now()::text)");
      await client.query("COMMIT");
    }
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    await client.query("SELECT pg_advisory_unlock(424242)").catch(() => {});
    client.release();
  }
}

async function seed(c: PoolClient) {
  const fIds: Record<string, number> = {};
  for (const f of DEMO_FLATMATES) {
    const r = await c.query(
      `INSERT INTO flatmates (name, gender, preferred_gender, occupation, city, locality, budget_min, budget_max,
        move_in_date, food, smoking, drinking, work_schedule, lifestyle, intro, is_demo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,TRUE) RETURNING id`,
      [f.name, f.gender, f.preferred_gender, f.occupation, f.city, f.locality, f.budget_min, f.budget_max,
        f.move_in_date, f.food, f.smoking, f.drinking, f.work_schedule, f.lifestyle, f.intro],
    );
    fIds[f.name] = r.rows[0].id;
  }
  const eIds: number[] = [];
  for (const e of DEMO_ENQUIRIES) {
    const r = await c.query(
      `INSERT INTO enquiries (customer_name, customer_phone, gender, preferred_flatmate_gender, occupation, city, locality,
        budget_min, budget_max, move_in_by, food, smoking, drinking, lifestyle, notes, status, is_demo, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,TRUE,'seed') RETURNING id`,
      [e.customer_name, e.customer_phone, e.gender, e.preferred_flatmate_gender, e.occupation, e.city, e.locality,
        e.budget_min, e.budget_max, e.move_in_by, e.food, e.smoking, e.drinking, e.lifestyle, e.notes, e.status],
    );
    eIds.push(r.rows[0].id);
  }
  await c.query(
    `INSERT INTO shortlists (enquiry_id, flatmate_id, score, reason, status, source) VALUES
     ($1,$2,84,'Same locality, budget overlaps, shares social + fitness','shortlisted','seed'),
     ($3,$4,93,'Meets every criterion; quiet, non-drinking, works from home','contacted','seed')`,
    [eIds[1], fIds["Arjun Patil"], eIds[2], fIds["Fatima Shaikh"]],
  );
  const acts: [string, number | null][] = [
    ["Workspace created with fictional demo data", null],
    ["New enquiry from Karan Malhotra (demo) — Kharadi, Pune", eIds[1]],
    ["Arjun Patil shortlisted for Karan Malhotra", eIds[1]],
    ["Pooja Verma's enquiry moved to “contacted”", eIds[2]],
    ["New enquiry from Riya Sharma (demo) — Hinjewadi Phase 1, Pune", eIds[0]],
  ];
  for (const [message, eid] of acts) {
    await c.query("INSERT INTO activities (message, source, enquiry_id) VALUES ($1,'web',$2)", [message, eid]);
  }
}

export async function q<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureReady();
  const r = await pool().query(text, params);
  return r.rows as T[];
}

export async function q1<T = any>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

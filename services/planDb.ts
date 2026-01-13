import initSqlJs from 'sql.js';
import { ReadingPlan, ReadingPlanItem } from '../types';

const STORAGE_KEY = 'vida_palabra_sqlite';
let dbPromise: Promise<any> | null = null;

async function loadDB() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await initSqlJs({
        // Usa CDN oficial; Vite soporta ESM
        locateFile: (file) => `https://sql.js.org/dist/${file}`
      });
      const saved = localStorage.getItem(STORAGE_KEY);
      const db = saved ? new SQL.Database(Uint8Array.from(atob(saved), c => c.charCodeAt(0))) : new SQL.Database();
      db.exec(`
        CREATE TABLE IF NOT EXISTS plans (
          id TEXT PRIMARY KEY,
          title TEXT,
          description TEXT,
          duration TEXT,
          topic TEXT,
          created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS plan_items (
          plan_id TEXT,
          idx INTEGER,
          item_id TEXT,
          passage TEXT,
          theme TEXT,
          reason TEXT,
          PRIMARY KEY(plan_id, idx)
        );
      `);
      return { SQL, db };
    })();
  }
  return dbPromise;
}

function persist(db: any) {
  const binary = db.export();
  const b64 = btoa(Array.from(binary, (b: number) => String.fromCharCode(b)).join(''));
  localStorage.setItem(STORAGE_KEY, b64);
}

export async function saveReadingPlan(plan: ReadingPlan, topic: string): Promise<string> {
  const { db } = await loadDB();
  const id = `${Date.now()}`;
  const created_at = new Date().toISOString();
  const stmtPlan = db.prepare(`INSERT INTO plans (id, title, description, duration, topic, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
  stmtPlan.run([id, plan.title, plan.description, plan.duration, topic, created_at]);
  stmtPlan.free();
  const stmtItem = db.prepare(`INSERT INTO plan_items (plan_id, idx, item_id, passage, theme, reason) VALUES (?, ?, ?, ?, ?, ?)`);
  plan.items.forEach((it: ReadingPlanItem, idx: number) => {
    stmtItem.run([id, idx, it.id, it.passage, it.theme, it.reason]);
  });
  stmtItem.free();
  persist(db);
  return id;
}

export async function listReadingPlans(): Promise<Array<{id:string; title:string; duration:string; topic:string; created_at:string}>> {
  const { db } = await loadDB();
  const res = db.exec(`SELECT id, title, duration, topic, created_at FROM plans ORDER BY created_at DESC`);
  if (!res.length) return [];
  const cols = res[0].columns;
  return res[0].values.map((row: any[]) => {
    const obj: any = {};
    cols.forEach((c: string, i: number) => obj[c] = row[i]);
    return obj;
  });
}

export async function getReadingPlan(id: string): Promise<ReadingPlan | null> {
  const { db } = await loadDB();
  const planRes = db.exec(`SELECT title, description, duration FROM plans WHERE id='${id}' LIMIT 1`);
  if (!planRes.length) return null;
  const planRow = planRes[0].values[0];
  const itemsRes = db.exec(`SELECT item_id, passage, theme, reason FROM plan_items WHERE plan_id='${id}' ORDER BY idx ASC`);
  const items = itemsRes.length ? itemsRes[0].values.map((r: any[]) => ({ id: r[0], passage: r[1], theme: r[2], reason: r[3] })) : [];
  return {
    title: planRow[0],
    description: planRow[1],
    duration: planRow[2],
    items
  };
}

export async function deleteReadingPlan(id: string): Promise<void> {
  const { db } = await loadDB();
  db.exec(`DELETE FROM plan_items WHERE plan_id='${id}'; DELETE FROM plans WHERE id='${id}';`);
  persist(db);
}

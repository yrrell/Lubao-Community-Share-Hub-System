// ============================================================
// src/lib/db.ts  –  Turso HTTP client (no native deps)
// ============================================================
// Works on Android/Termux because it uses fetch() instead of
// the @libsql/client native binary (which rejects android/arm64).
//
// Drop-in replacement: same db.execute({ sql, args }) interface.
//
// .env.local:
//   TURSO_DATABASE_URL=https://lsh-yrrell.aws-us-east-2.turso.io
//   TURSO_AUTH_TOKEN=your_auth_token
// ============================================================

type ScalarValue = string | number | boolean | null;

interface ExecuteInput {
  sql:   string;
  args?: ScalarValue[];
}

interface Row {
  [column: string]: ScalarValue;
}

export interface ExecuteResult {
  rows:              Row[];
  lastInsertRowid:   number | null;
  rowsAffected:      number;
}

// ── Turso value serialiser ────────────────────────────────────────────────────
function toTursoValue(v: ScalarValue) {
  if (v === null || v === undefined) return { type: "null" };
  if (typeof v === "number")
    return Number.isInteger(v)
      ? { type: "integer", value: String(v) }
      : { type: "float",   value: String(v) };
  if (typeof v === "boolean") return { type: "integer", value: v ? "1" : "0" };
  return { type: "text", value: String(v) };
}

// ── Core execute ─────────────────────────────────────────────────────────────
async function execute(query: string | ExecuteInput): Promise<ExecuteResult> {
  const url   = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;

  if (!url)   throw new Error("Missing env: TURSO_DATABASE_URL");
  if (!token) throw new Error("Missing env: TURSO_AUTH_TOKEN");

  const { sql, args = [] } =
    typeof query === "string" ? { sql: query, args: [] } : query;

  const response = await fetch(`${url}/v2/pipeline`, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql, args: args.map(toTursoValue) } },
        { type: "close" },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Turso HTTP ${response.status}: ${text}`);
  }

  const data   = await response.json() as { results: { type: string; response?: { result: { cols: { name: string }[]; rows: { type: string; value?: string }[][]; affected_row_count: number; last_insert_rowid: string | null } }; error?: { message: string } }[] };
  const result = data.results[0];

  if (result.type === "error") {
    throw new Error(`Turso error: ${result.error?.message ?? "unknown"}`);
  }

  const { cols, rows, affected_row_count, last_insert_rowid } =
    result.response!.result;

  const colNames = cols.map((c) => c.name);

  const objectRows: Row[] = rows.map((row) => {
    const obj: Row = {};
    row.forEach((cell, i) => {
      if (cell.type === "null")    obj[colNames[i]] = null;
      else if (cell.type === "integer") obj[colNames[i]] = Number(cell.value);
      else if (cell.type === "float")   obj[colNames[i]] = Number(cell.value);
      else                              obj[colNames[i]] = cell.value ?? null;
    });
    return obj;
  });

  return {
    rows:            objectRows,
    lastInsertRowid: last_insert_rowid ? Number(last_insert_rowid) : null,
    rowsAffected:    affected_row_count,
  };
}

// ── Exported db object — matches @libsql/client interface ────────────────────
export const db = { execute };

import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function initDb() {
  await pool.query(`
    create table if not exists etf_rows (
      id bigserial primary key,
      data jsonb not null
    );
  `);
  await pool.query(`
    create table if not exists etf_metadata (
      id int primary key default 1,
      columns text[] not null
    );
  `);
  const { rows } = await pool.query('select 1 from etf_metadata where id=1');
  if (!rows.length) {
    await pool.query('insert into etf_metadata (id, columns) values (1, ARRAY[]::text[])');
  }
  await pool.query(`
    create table if not exists admins (
      id bigserial primary key,
      email text unique not null,
      password_hash text not null
    );
  `);
}

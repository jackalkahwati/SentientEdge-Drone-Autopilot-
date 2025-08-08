import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

export const pg = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});



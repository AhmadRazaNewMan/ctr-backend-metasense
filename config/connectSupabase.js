const { Pool } = require("pg");

//Configure ENV
const dotenv = require("dotenv");
dotenv.config();

const supabaseUser = process.env.SUPABASE_USER;
const supabaseHost = process.env.SUPABASE_HOST;
const supabaseDatabase = process.env.SUPABASE_DATABASE_NAME;
const supabasePassword = process.env.SUPABSE_DATABASE_PASSWORD;

if (!supabaseUser) throw Error("SUPABASE_USER is empty");
if (!supabaseHost) throw Error("SUPABASE_HOST is empty");
if (!supabaseDatabase) throw Error("SUPABASE_DATABASE_NAME is empty");
if (!supabasePassword) throw Error("SUPABSE_DATABASE_PASSWORD is empty");

// Create a connection pool to the database using the service role key
const pool = new Pool({
  user: supabaseUser,
  host: supabaseHost,
  database: supabaseDatabase,
  password: supabasePassword,
  port: 6543,
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error("Error acquiring client", err.stack);
  }
  client.query("SELECT NOW()", (err, result) => {
    release();
    if (err) {
      return console.error("Error executing query", err.stack);
    }
    console.log(result.rows);
  });
});

module.exports = pool;

const { createClient } = require("@supabase/supabase-js");

//Configuring ENV
const dotenv = require("dotenv");
dotenv.config();

const supabaseURL = process.env.SUPABASE_URL;
const supabaseApiKey = process.env.SUPABASE_API_KEY;

if (!supabaseURL) throw Error("SUPABASE_URL is empty");
if (!supabaseApiKey) throw Error("SUPABASE_API_KEY is empty");

const supabase = createClient(supabaseURL, supabaseApiKey);

module.exports = supabase;

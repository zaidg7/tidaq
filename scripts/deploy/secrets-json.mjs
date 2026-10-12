// Prints a JSON object of the named environment variables for `wrangler secret bulk`.
// Unset or empty variables are skipped (and listed on stderr), never printed.
const names = process.argv.slice(2);
const secrets = {};
const missing = [];
for (const name of names) {
  const value = process.env[name];
  if (value) secrets[name] = value;
  else missing.push(name);
}
if (missing.length > 0) console.error(`Skipping unset secrets: ${missing.join(', ')}`);
process.stdout.write(JSON.stringify(secrets));

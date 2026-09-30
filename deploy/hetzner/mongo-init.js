const password = process.env.SNEUP_MONGO_PASSWORD;
const rootPassword = process.env.MONGO_INITDB_ROOT_PASSWORD;
if (!/^[a-f0-9]{64}$/.test(password || '') || !/^[a-f0-9]{64}$/.test(rootPassword || '') || rootPassword === password) {
  throw new Error('MongoDB app and root passwords must be independent 64-character random lowercase hexadecimal values.');
}
db.getSiblingDB('sneup').createUser({
  user: 'sneup',
  pwd: password,
  roles: [{ role: 'readWrite', db: 'sneup' }]
});

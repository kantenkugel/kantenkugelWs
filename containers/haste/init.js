const { Client } = require('pg');
const { readFileSync, writeFileSync } = require('fs');

//env read
const host = process.env.PGHOST || 'localhost';
const user = process.env.POSTGRES_USER || 'admin';
const password = process.env.POSTGRES_PASSWORD || 'pw';
const database = process.env.POSTGRES_DB || 'database';
const port = process.env.PGPORT || 5432;

//populate config file with correct postgres connection string (based on env)
const configFile = './config.js';
console.log('Populating config file with postgres connection string');
const config = JSON.parse(readFileSync(configFile));
const postgresURL = `postgresql://${user}:${password}@${host}:${port}/${database}`
config.storage.connectionUrl = postgresURL;
writeFileSync(configFile, JSON.stringify(config));

//initialize table
console.log('Initializing table');
const client = new Client({
  user,
  host,
  password,
  database,
  port,
});

client.connect((err) => {
  if (err) {
    console.error('connection error', err);
    process.exit(1);
  } else {
    client.query('CREATE TABLE IF NOT EXISTS entries (id serial primary key, key varchar(255) not null, value text not null, expiration int, unique(key));', err => {
        
        console.log('Table initialized');
        client.end();
    });
  }
});

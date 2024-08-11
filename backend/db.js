// db.js
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  database: 'chas_banksite',
  user: 'root', // Note: it's 'user' not 'User'
  password: '', 
};

const db = mysql.createPool(dbConfig);

export default db;
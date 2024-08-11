// migrations.js
import db from './db.js';

async function createTables() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
    `);

    console.log('Tables created successfully!');
  } catch (error) {
    console.error(error);
  }
}

createTables();
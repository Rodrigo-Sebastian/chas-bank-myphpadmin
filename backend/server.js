import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import db from './db.js';
import bcrypt from 'bcrypt';
import session from 'express-session';

const app = express();

app.use(session({
  secret: 'y-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 60000 }
}));

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function generateOTP() {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
}

app.post('/users', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.execute(`
      INSERT INTO users (username, password)
      VALUES (?, ?)
    `, [username, hashedPassword]);

    const userId = result.insertId;

    const [accountResult] = await db.execute(`
      INSERT INTO accounts (user_id, balance)
      VALUES (?, 0.00)
    `, [userId]);

    if (accountResult.affectedRows === 1) {
      res.json({ message: 'User and account created successfully', id: userId });
    } else {
      res.status(500).json({ message: 'Error creating account' });
    }
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});


app.post('/sessions', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [users] = await db.execute(`
      SELECT * FROM users WHERE username = ?
    `, [username]);

    if (users.length > 0) {
      const user = users[0];
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (isValidPassword) {
        req.session.username = username;
        req.session.userId = user.id;
        const token = generateToken();
        await db.execute(`
          INSERT INTO sessions (user_id, token)
          VALUES (?, ?)
        `, [user.id, token]);
        res.status(200).json({ message: 'Logged in successfully', token });
      } else {
        res.status(401).json({ message: 'Invalid username or password' });
      }
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

function generateToken() {
  return 'some-random-token';
}

// Exempel på GET /me/accounts
app.get('/me/accounts', async (req, res) => {
  const token = req.headers.authorization; // eller hur du skickar token
  try {
    // Hämta session
    const [sessionRows] = await db.execute('SELECT * FROM sessions WHERE token = ?', [token]);
    if (sessionRows.length === 0) {
      return res.status(401).json({ message: 'Invalid session' });
    }
    const session = sessionRows[0];

    // Hämta användare
    const [userRows] = await db.execute('SELECT * FROM users WHERE id = ?', [session.user_id]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = userRows[0];

    // Hämta konto
    const [accountRows] = await db.execute('SELECT * FROM accounts WHERE user_id = ?', [user.id]);
    if (accountRows.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }
    const account = accountRows[0];

    res.json({ balance: account.balance });
  } catch (error) {
    console.error('Error fetching account balance:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


// Exempel på POST /me/accounts/transactions
app.post('/me/accounts/transactions', async (req, res) => {
  const token = req.headers.authorization; // eller hur du skickar token
  const { amount } = req.body;
  try {
    // Hämta session
    const [sessionRows] = await db.execute('SELECT * FROM sessions WHERE token = ?', [token]);
    if (sessionRows.length === 0) {
      return res.status(401).json({ message: 'Invalid session' });
    }
    const session = sessionRows[0];

    // Hämta konto
    const [accountRows] = await db.execute('SELECT * FROM accounts WHERE user_id = ?', [session.user_id]);
    if (accountRows.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }
    const account = accountRows[0];

    // Uppdatera balans
    const newBalance = parseFloat(account.balance) + parseFloat(amount);
    await db.execute('UPDATE accounts SET balance = ? WHERE user_id = ?', [newBalance, session.user_id]);

    res.json({ message: 'Transaction successful', newBalance });
  } catch (error) {
    console.error('Error processing transaction:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

const port = 3001;
app.listen(port, () => {
  console.log(`Bank's backend is running on http://localhost:${port}`);
});

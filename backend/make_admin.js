const axios = require('axios');
const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database/learning_app.db');

async function makeAdmin() {
  const email = `admin_${Date.now()}@test.com`;
  const password = 'password123';
  const displayName = 'Admin User';

  // Register a new user
  try {
    await axios.post('http://localhost:5000/api/auth/register', {
      email,
      password,
      display_name: displayName,
    });
    console.log(`User ${email} registered successfully.`);
  } catch (error) {
    console.error(`Failed to register user: ${error.message}`);
    return;
  }

  // Update the user to be an admin
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    }
  });

  db.run('UPDATE users SET is_admin = 1 WHERE email = ?', [email], function (err) {
    if (err) {
      console.error('Error updating user to admin:', err.message);
    } else {
      console.log(`User ${email} is now an admin.`);
    }
    db.close();
  });
}

makeAdmin();

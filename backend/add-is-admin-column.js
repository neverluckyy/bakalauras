const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database/learning_app.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

db.serialize(() => {
  // Check if the is_admin column exists
  db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) {
      console.error('Error getting table info:', err.message);
      return;
    }

    const isAdminColumn = columns.find(column => column.name === 'is_admin');

    if (!isAdminColumn) {
      // If the column doesn't exist, add it
      db.run("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0", (err) => {
        if (err) {
          console.error('Error adding is_admin column:', err.message);
        } else {
          console.log("Column 'is_admin' added to 'users' table successfully.");
        }

        // Close the database connection
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
          } else {
            console.log('Database connection closed.');
          }
        });
      });
    } else {
      console.log("Column 'is_admin' already exists in 'users' table.");

      // Close the database connection
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('Database connection closed.');
        }
      });
    }
  });
});

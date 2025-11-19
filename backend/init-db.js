const { initDatabase } = require('./database/init');

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    await initDatabase();
    console.log('Database initialized successfully!');
    
    // Now run the cleanup script to populate sections
    console.log('Running cleanup script to populate sections...');
    require('./cleanup-database.js');
    
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

initializeDatabase();

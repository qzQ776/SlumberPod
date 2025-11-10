const mysql = require('mysql2/promise');

async function checkTables() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Qi413040',
      database: 'slumberpod'
    });
    
    const [rows] = await connection.execute("SHOW TABLES LIKE '%post%'");
    console.log('Existing post-related tables:');
    rows.forEach(row => console.log('- ' + Object.values(row)[0]));
    
    await connection.end();
  } catch (error) {
    console.log('Database connection error:', error.message);
  }
}

checkTables();
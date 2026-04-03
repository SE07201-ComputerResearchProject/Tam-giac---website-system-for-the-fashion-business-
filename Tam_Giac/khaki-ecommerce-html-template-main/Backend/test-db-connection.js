require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const {
  connectDB,
  closeSqlPool,
  getSqlPool,
  sequelize,
  dbRuntimeConfig
} = require('./config/database');

(async () => {
  console.log('Testing DB connection with current backend config:', dbRuntimeConfig);

  try {
    await connectDB();

    const pool = getSqlPool();
    let rows;

    if (pool) {
      const result = await pool.request().query('SELECT DB_NAME() AS databaseName, 1 AS ok');
      rows = result.recordset;
    } else {
      const [result] = await sequelize.query('SELECT DB_NAME() AS databaseName, 1 AS ok');
      rows = result;
    }

    console.log('Query result:', rows);
    await closeSqlPool();
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('DB connection error:');
    console.error(err && err.message);
    console.error(err);

    await closeSqlPool().catch(() => {});
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
})();

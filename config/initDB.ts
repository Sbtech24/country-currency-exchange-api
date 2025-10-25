import  pool  from "./db";

export const initializeDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS countries (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      capital TEXT,
      region TEXT,
      population BIGINT NOT NULL,
      currency_code TEXT NOT NULL,
      exchange_rate FLOAT,
      estimated_gdp FLOAT,
      flag_url TEXT,
      last_refreshed_at TIMESTAMP
    );
  `);
};

initializeDB()
  .then(() => console.log("Database initialized successfully"))
  .catch((err) => console.error("Error initializing database:", err));

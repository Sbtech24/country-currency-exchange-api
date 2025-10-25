import type { Request, Response, NextFunction } from "express";
import { fetchData } from "../utils/fetchCountryData";
import pool from "../config/db";

export async function refreshData(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const data = await fetchData();

  // Prepare insert
  const query = `
       INSERT INTO countries 
  (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  ON CONFLICT (name)
  DO UPDATE SET 
    capital = EXCLUDED.capital,
    region = EXCLUDED.region,
    population = EXCLUDED.population,
    currency_code = EXCLUDED.currency_code,
    exchange_rate = EXCLUDED.exchange_rate,
    estimated_gdp = EXCLUDED.estimated_gdp,
    flag_url = EXCLUDED.flag_url,
    last_refreshed_at = EXCLUDED.last_refreshed_at
  RETURNING *;
    `;

  const createdCountries = [];

  // Insert each record
  for (const c of data) {
    const result = await pool.query(query, [
      c.name,
      c.capital,
      c.region,
      c.population,
      c.currency_code,
      c.exchange_rate,
      c.estimated_gdp,
      c.flag_url,
      c.last_refreshed_at,
    ]);
    createdCountries.push(result.rows[0]);
  }

  res.status(200).json({ data: createdCountries });
}

export async function getAllCountries(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const query = `select * from countries`;

    const result = await pool.query(query);
    const created = result.rows;
    res.status(200).json({ data: created });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });

    next(err);
  }
}

export async function getAllCountryByName(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { name } = req.params;

    const formatedName = name?.toString().toLowerCase();

    if (!name) {
      return res.status(404).json({ error: "Bad request please provide name" });
    }
    const result = await pool.query(
      `SELECT * FROM countries WHERE LOWER(name) = $1 `,
      [formatedName]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Country Not found" });
    }
    const created = result.rows;
    res.status(200).json({ data: created });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
    next(err);
  }
}
export async function deleteCountryByName(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { name } = req.params;

    const formatedName = name?.toString().toLowerCase();

    if (!name) {
      return res.status(404).json({ error: "Bad request please provide name" });
    }
    const result = await pool.query(
      `DELETE FROM countries WHERE LOWER(name) = $1 RETURNING *`,
      [formatedName]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Country Not found" });
    }

    res.status(200).json({ message: "Country Successfully delete" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
    next(err);
  }
}

export async function getStatus(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const query = `SELECT 
        COUNT(*)::int AS total_countries,
        MAX(last_refreshed_at) AS last_refreshed_at
      FROM countries;
       `;
    const result = await pool.query(query);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No Country Found" });
    }

    const { total_countries, last_refreshed_at } = result.rows[0];
    return res.status(200).json({
      data: {
        totalCountries: Number(total_countries),
        lastRefreshedAt: last_refreshed_at,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
    next(err);
  }
}

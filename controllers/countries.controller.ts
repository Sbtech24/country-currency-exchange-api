import type { Request, Response, NextFunction } from "express";
import { fetchData } from "../utils/fetchCountryData";
import { createCanvas } from "canvas";
import fs from "fs";
import pool from "../config/db";
import path from "path";

export async function refreshData(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await fetchData();

    if (!data || data.length === 0) {
      return res.status(503).json({
        error: "External data source unavailable",
        details: "Could not fetch data from REST Countries API",
      });
    }

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
    const lastRefreshedAt = new Date().toISOString();

    for (const c of data) {
      try {
        const errors: Record<string, string> = {};
        if (!c.name) errors.name = "is required";
        if (!c.population) errors.population = "is required";
        if (!c.currency_code) errors.currency_code = "is required";

        if (Object.keys(errors).length > 0) {
          return res.status(400).json({
            error: "Validation failed",
            details: errors,
          });
        }
        const result = await pool.query(query, [
          c.name,
          c.capital || null,
          c.region || null,
          c.population,
          c.currency_code || null,
          c.exchange_rate || null,
          c.estimated_gdp || 0,
          c.flag_url || null,
          lastRefreshedAt,
        ]);
        createdCountries.push(result.rows[0]);
      } catch (dbErr) {
        console.error("Database insert error for:", dbErr);
      }
    }

    // ✅ Generate summary image after updating DB
    await generateSummaryImageFile(lastRefreshedAt);

    return res.status(200).json({
      message: "Countries refreshed successfully",
      total: createdCountries.length,
      last_refreshed_at: lastRefreshedAt,
    });
  } catch (err: any) {
    console.error("Refresh failed:", err);
    if (err.message.includes("fetch failed")) {
      return res.status(503).json({
        error: "External data source unavailable",
        details: "Could not fetch data from one or more APIs",
      });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAllCountries(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { region, currency, sort } = req.query;
    const values: any[] = [];
    const where: string[] = [];

    if (region) {
      // Capitalize the first letter of region before query
      const formattedRegion =
        region.toString().charAt(0).toUpperCase() +
        region.toString().slice(1).toLowerCase();
      values.push(formattedRegion);
      where.push(`region = $${values.length}`);
    }

    if (currency) {
      values.push(currency.toString().toUpperCase());
      where.push(`currency_code = $${values.length}`);
    }

    let order = "ORDER BY id";
    if (sort === "gdp_desc") order = `ORDER BY estimated_gdp DESC NULLS LAST`;

    const sql = `
    SELECT id, name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at
    FROM countries
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ${order};
  `;

    const { rows } = await pool.query(sql, values);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
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

async function generateSummaryImageFile(lastRefreshedAt: string) {
  const cacheDir = path.join(__dirname, "../cache");
  const imgPath = path.join(cacheDir, "summary.png");

  const summaryQuery = `
    SELECT COUNT(*)::int AS total_countries, MAX(last_refreshed_at) AS last_refreshed_at
    FROM countries;
  `;

  const gdpQuery = `
    SELECT name, estimated_gdp
    FROM countries
    ORDER BY estimated_gdp DESC
    LIMIT 5;
  `;

  const [summaryResult, gdpResult] = await Promise.all([
    pool.query(summaryQuery),
    pool.query(gdpQuery),
  ]);

  const { total_countries } = summaryResult.rows[0];
  const topCountries = gdpResult.rows;

  if (!total_countries || total_countries === 0) return;

  const width = 800;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#f7f9fb";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#003366";
  ctx.font = "bold 28px Poppins";
  ctx.fillText("🌍 Global Country Summary", 40, 60);

  ctx.font = "20px Poppins";
  ctx.fillStyle = "#333";
  ctx.fillText(`Total Countries: ${total_countries}`, 40, 120);
  ctx.fillText(
    `Last Refreshed: ${new Date(lastRefreshedAt).toLocaleString()}`,
    40,
    160
  );

  ctx.fillText("Top 5 by Estimated GDP:", 40, 220);
  topCountries.forEach((c, i) => {
    ctx.fillText(`${i + 1}. ${c.name} - ${c.estimated_gdp}`, 60, 250 + i * 25);
  });

  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

  const out = fs.createWriteStream(imgPath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  out.on("finish", () => console.log("✅ Summary image generated:", imgPath));
}

export async function generateSummaryImage(req: Request, res: Response) {
  try {
    const cacheDir = path.join(__dirname, "../cache");
    const imgPath = path.join(cacheDir, "summary.png");

    if (!fs.existsSync(imgPath)) {
      return res.status(404).json({ error: "Summary image not found" });
    }

    res.setHeader("Content-Type", "image/png");
    return res.sendFile(imgPath);
  } catch (err) {
    console.error("Error serving summary image:", err);
    return res.status(500).json({ error: "Failed to serve summary image" });
  }
}

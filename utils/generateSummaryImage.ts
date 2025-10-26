import { createCanvas } from "canvas";
import fs from "fs";

export async function generateSummaryImage(countries: any[], timestamp: string) {
  const totalCountries = countries.length;
  const top5 = [...countries]
    .filter(c => c.estimated_gdp)
    .sort((a, b) => b.estimated_gdp - a.estimated_gdp)
    .slice(0, 5);

  const canvas = createCanvas(800, 500);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#f8f9fa";
  ctx.fillRect(0, 0, 800, 500);

  // Title
  ctx.fillStyle = "#212529";
  ctx.font = "bold 28px Arial";
  ctx.fillText("🌍 Country Summary", 40, 50);

  // Info
  ctx.font = "20px Arial";
  ctx.fillText(`Total Countries: ${totalCountries}`, 40, 100);
  ctx.fillText(`Last Refreshed: ${timestamp}`, 40, 140);

  // Top 5 GDP
  ctx.fillText("Top 5 by Estimated GDP:", 40, 200);
  ctx.font = "18px Arial";
  top5.forEach((c, i) => {
    ctx.fillText(`${i + 1}. ${c.name} — ${c.estimated_gdp.toFixed(2)}`, 60, 240 + i * 30);
  });

  // Save to cache
  const dir = "cache";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(`${dir}/summary.png`, buffer);
}

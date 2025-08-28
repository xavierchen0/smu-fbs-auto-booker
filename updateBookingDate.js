const fs = require("fs");
const path = require("path");
const logger = require("./logger");

const envPath = path.join(__dirname, ".env");
let env = fs.readFileSync(envPath, "utf-8");

// TODO: improve logging
// Extract current date
let match = env.match(/BOOKING_DATE=(.+)/);
if (!match) {
  logger.error("BOOKING_DATE not found in .env file");
  process.exit(1);
}

let currentDate = new Date(match[1]);

// Increment by 1 day
currentDate.setDate(currentDate.getDate() + 1);

// If it's Sunday (0), skip to Monday (1)
if (currentDate.getDay() === 0) {
  currentDate.setDate(currentDate.getDate() + 1);
}

// Format as YYYY-MM-DD
let newDate = currentDate.toISOString().split("T")[0];

// Replace in file
env = env.replace(/BOOKING_DATE=.*/, `BOOKING_DATE=${newDate}`);
fs.writeFileSync(envPath, env);

logger.info({ newDate }, "Updated BOOKING_DATE");

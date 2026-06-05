const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const API_KEY = process.env.WEATHER_API_KEY;

console.log("API KEY LOADED:", API_KEY ? "YES" : "NO");

const cache = {};
const CACHE_DURATION = 10 * 60 * 1000;

// ---------------- CITY DB ----------------
const CITY_DB = {
  Nairobi: { lat: -1.2921, lon: 36.8219 },
  Mombasa: { lat: -4.0435, lon: 39.6682 },
  Kisumu: { lat: -0.0917, lon: 34.768 },
  London: { lat: 51.5072, lon: -0.1276 },
  NewYork: { lat: 40.7128, lon: -74.006 },
  Dubai: { lat: 25.2048, lon: 55.2708 },
  Tokyo: { lat: 35.6762, lon: 139.6503 },
  Paris: { lat: 48.8566, lon: 2.3522 },
};

const normalize = (city) =>
  city.toLowerCase().replace(/\s/g, "");

app.get("/", (req, res) => {
  res.json({ status: "Weather Backend Running" });
});

app.get("/weather", async (req, res) => {
  try {
    const { city, days = 3, ai = false, units = "metric" } = req.query;

    if (!API_KEY) {
      return res.status(500).json({ error: "Missing API key" });
    }

    if (!city) {
      return res.status(400).json({ error: "City is required" });
    }

    const key = normalize(city);
    const cacheKey = `${key}-${days}-${units}`;

    if (
      cache[cacheKey] &&
      Date.now() - cache[cacheKey].time < CACHE_DURATION
    ) {
      return res.json(cache[cacheKey].data);
    }

    let params = {
      days,
      ai,
      units,
    };

    if (CITY_DB[key]) {
      params.lat = CITY_DB[key].lat;
      params.lon = CITY_DB[key].lon;
    } else {
      params.city = city;
    }

    const response = await axios.get(
      "https://api.weather-ai.co/v1/weather",
      {
        params,
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );

    const result = {
      ...response.data,
      searched_city: city,
      mode: CITY_DB[key] ? "local_db" : "api_city_mode",
    };

    cache[cacheKey] = {
      data: result,
      time: Date.now(),
    };

    return res.json(result);
  } catch (error) {
    console.log("ERROR:", error.response?.data || error.message);

    return res.status(500).json({
      error: "Backend failed",
      details: error.response?.data || error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
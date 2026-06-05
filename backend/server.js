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

const CITY_DB = {
  nairobi: { lat: -1.2921, lon: 36.8219 },
  mombasa: { lat: -4.0435, lon: 39.6682 },
  kisumu: { lat: -0.0917, lon: 34.768 },
  london: { lat: 51.5072, lon: -0.1276 },
  newyork: { lat: 40.7128, lon: -74.006 },
  dubai: { lat: 25.2048, lon: 55.2708 },
  tokyo: { lat: 35.6762, lon: 139.6503 },
  paris: { lat: 48.8566, lon: 2.3522 },
};

function normalize(city) {
  return city.toLowerCase().replace(/\s/g, "");
}

async function geocodeCity(city) {
  try {
    const res = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: city,
          format: "json",
          limit: 1,
        },
        headers: {
          "User-Agent": "weather-dashboard-app",
        },
        timeout: 8000,
      }
    );

    if (!res.data || res.data.length === 0) return null;

    return {
      lat: parseFloat(res.data[0].lat),
      lon: parseFloat(res.data[0].lon),
      displayName: res.data[0].display_name,
    };
  } catch (err) {
    console.log("Geocoding failed:", err.message);
    return null;
  }
}

app.get("/", (req, res) => {
  res.json({ status: "Weather Backend Running" });
});

app.get("/weather", async (req, res) => {
  try {
    const {
      city,
      lat,
      lon,
      days = 3,
      ai = false,
      units = "metric",
    } = req.query;

    if (!API_KEY) {
      return res.status(500).json({ error: "Missing API key" });
    }

    let geo = null;
    let resolvedFrom = "unknown";

    if (lat && lon) {
      geo = {
        lat: parseFloat(lat),
        lon: parseFloat(lon),
      };
      resolvedFrom = "coords";
    }

    else if (city && CITY_DB[normalize(city)]) {
      geo = CITY_DB[normalize(city)];
      resolvedFrom = "local_db";
    }

    else if (city) {
      geo = await geocodeCity(city);
      resolvedFrom = "geocoding";

      if (!geo) {
        return res.status(404).json({
          error: "City not found (all sources failed)",
        });
      }
    }

    else {
      return res.status(400).json({
        error: "Provide city or lat/lon",
      });
    }

    const cacheKey = `${geo.lat}-${geo.lon}-${days}-${units}`;

    if (
      cache[cacheKey] &&
      Date.now() - cache[cacheKey].time < CACHE_DURATION
    ) {
      return res.json(cache[cacheKey].data);
    }

    const response = await axios.get(
      "https://api.weather-ai.co/v1/weather",
      {
        params: {
          lat: geo.lat,
          lon: geo.lon,
          days,
          ai,
          units,
        },
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );

    const result = {
      ...response.data,
      searched_city: city,
      resolved_location: geo,
      resolved_from: resolvedFrom,
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
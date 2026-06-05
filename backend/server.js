const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const API_KEY = process.env.WEATHER_API_KEY;

console.log("API KEY LOADED:", API_KEY ? "YES" : "NO");



// Weather cache (10 min)
const weatherCache = {};
const CACHE_DURATION = 10 * 60 * 1000;

// Geocode cache 
const geoCache = {};
const GEO_CACHE_DURATION = 24 * 60 * 60 * 1000;


async function geocodeCity(city) {
  const key = city.toLowerCase().trim();

  // return cached geocode if available
  if (
    geoCache[key] &&
    Date.now() - geoCache[key].timestamp < GEO_CACHE_DURATION
  ) {
    console.log("📦 Serving cached geocode:", key);
    return geoCache[key].data;
  }

  try {
    console.log("Geocoding:", city);

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

    const result = {
      lat: parseFloat(res.data[0].lat),
      lon: parseFloat(res.data[0].lon),
      displayName: res.data[0].display_name,
    };

    // store in cache
    geoCache[key] = {
      data: result,
      timestamp: Date.now(),
    };

    console.log("Geocoding success");
    return result;
  } catch (err) {
    console.log("❌ Geocoding failed:", err.message);
    return null;
  }
}


app.get("/", (req, res) => {
  res.json({
    status: "Weather Backend Running",
  });
});


app.get("/weather", async (req, res) => {
  try {
    const {
      city,
      days = 3,
      ai = false,
      units = "metric",
    } = req.query;

    console.log("Incoming request:", req.query);

    if (!API_KEY) {
      return res.status(500).json({ error: "Missing API key" });
    }

    if (!city) {
      return res.status(400).json({ error: "City is required" });
    }

    // cache key
    const cacheKey = `${city}-${days}-${units}-${ai}`;

    // return cached weather if valid
    if (
      weatherCache[cacheKey] &&
      Date.now() - weatherCache[cacheKey].timestamp < CACHE_DURATION
    ) {
      console.log("Serving cached weather");
      return res.json(weatherCache[cacheKey].data);
    }

    // geocode city
    const geo = await geocodeCity(city);

    if (!geo) {
      return res.status(404).json({ error: "City not found" });
    }

    console.log(`📍 ${city} → ${geo.lat}, ${geo.lon}`);

    // weather API call
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
    };

    // cache result
    weatherCache[cacheKey] = {
      data: result,
      timestamp: Date.now(),
    };

    console.log("Weather API success");

    res.json(result);
  } catch (error) {
    console.log("ERROR:", error.response?.data || error.message);

    res.status(500).json({
      error: "Backend failed",
      details: error.response?.data || error.message,
    });
  }
});


app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
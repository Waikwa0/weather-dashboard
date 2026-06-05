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

// -------------------- CACHE --------------------
const weatherCache = {};
const CACHE_DURATION = 10 * 60 * 1000;

async function geocodeCity(city) {
  try {
    const url = "https://nominatim.openstreetmap.org/search";

    const res = await axios.get(url, {
      params: {
        q: city,
        format: "json",
        limit: 1,
      },
      headers: {
        "User-Agent": "weather-dashboard-app",
        "Accept-Language": "en",
      },
      timeout: 8000,
    });

    if (!res.data || res.data.length === 0) {
      return null;
    }

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
      days = 3,
      ai = false,
      units = "metric",
      lat,
      lon,
    } = req.query;

    if (!API_KEY) {
      return res.status(500).json({ error: "Missing API key" });
    }

    const cacheKey = `${city || lat}-${lon}-${days}-${units}-${ai}`;

    if (
      weatherCache[cacheKey] &&
      Date.now() - weatherCache[cacheKey].timestamp < CACHE_DURATION
    ) {
      return res.json(weatherCache[cacheKey].data);
    }

    let geo = null;

    
    if (lat && lon) {
      geo = { lat: parseFloat(lat), lon: parseFloat(lon) };
    } else if (city) {
      geo = await geocodeCity(city);

      if (!geo) {
        return res.status(404).json({
          error: "City not found (geocoding failed)",
        });
      }
    } else {
      return res.status(400).json({
        error: "Provide either city or lat/lon",
      });
    }

    console.log(`📍 Location resolved:`, geo);


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
      searched_city: city || "custom_location",
      resolved_location: geo,
    };

   
    weatherCache[cacheKey] = {
      data: result,
      timestamp: Date.now(),
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
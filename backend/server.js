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


async function geocodeCity(city) {
  const url = `https://nominatim.openstreetmap.org/search`;

  const res = await axios.get(url, {
    params: {
      q: city,
      format: "json",
      limit: 1,
    },
    headers: {
      "User-Agent": "weather-app",
    },
  });

  if (!res.data || res.data.length === 0) return null;

  return {
    lat: parseFloat(res.data[0].lat),
    lon: parseFloat(res.data[0].lon),
    displayName: res.data[0].display_name,
  };
}

//Weather endpoint

app.get("/weather", async (req, res) => {
  try {
    const { city, days = 3, ai = false, units = "metric" } = req.query;

    console.log("Incoming request:", req.query);

    if (!API_KEY) {
      return res.status(500).json({ error: "Missing API key" });
    }

    if (!city) {
      return res.status(400).json({ error: "City is required" });
    }

    //GEO CODING
    const geo = await geocodeCity(city);

    if (!geo) {
      return res.status(404).json({ error: "City not found" });
    }

    // WEATHER API CALL
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

    console.log("Weather API success");

    // send enriched response
    res.json({
      ...response.data,
      searched_city: city,
      resolved_location: geo,
    });

  } catch (error) {
    console.log("ERROR:", error.response?.data || error.message);

    res.status(500).json({
      error: "Backend failed",
      details: error.response?.data || error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
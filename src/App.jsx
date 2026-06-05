import { useState } from "react";
import { getWeather } from "./services/weatherApi";

function App() {
  const [cityInput, setCityInput] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!cityInput.trim()) {
      setError("Please enter a city name");
      return;
    }

    setError("");
    setLoading(true);
    setWeather(null);

    try {
      const data = await getWeather(cityInput);

      console.log("WEATHER DATA:", data);

      setWeather(data);

      setSelectedCity(data.searched_city || cityInput);
    } catch (err) {
      console.log(err);
      setError("Failed to fetch weather data");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const current = weather?.current;
  const location = weather?.location;
  const hourly = weather?.hourly?.[0];

  const getBackgroundClass = (code) => {
  // WeatherAI condition codes 
  if (!code) return "bg-gradient-to-br from-blue-100 to-blue-200";

  const c = Number(code);

  // Clear / sunny
  if (c === 0 || c === 1)
    return "bg-gradient-to-br from-yellow-100 to-blue-200";

  // Cloudy
  if (c === 2 || c === 3 || c === 45)
    return "bg-gradient-to-br from-gray-200 to-gray-400";

  // Rain
  if (c >= 51 && c <= 67)
    return "bg-gradient-to-br from-blue-300 to-blue-600";

  // Storm
  if (c >= 71 && c <= 99)
    return "bg-gradient-to-br from-gray-700 to-gray-900";

  return "bg-gradient-to-br from-blue-100 to-blue-200";
};

  return (
     <div className={`min-h-screen flex flex-col items-center p-6 transition-all duration-500 ${getBackgroundClass(current?.condition_code)}`}>

      {/* Header */}
      <h1 className="text-3xl font-bold text-blue-700 mb-6">
        Weather Dashboard
      </h1>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <input
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Enter any city..."
          className="px-4 py-2 border rounded-lg shadow-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <button
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
        >
          Search
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <p className="text-gray-600">Loading weather...</p>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-500 mb-4">{error}</p>
      )}

      {/* Weather Card */}
      {weather && current && (
        <div className="bg-white shadow-2xl rounded-2xl p-6 w-full max-w-md">

          {/* Location */}
          <h2 className="text-lg font-semibold text-gray-700 mb-1">
            📍 {selectedCity}
          </h2>

          <p className="text-xs text-gray-400 mb-4">
            Lat: {location?.lat?.toFixed(2)} | Lon: {location?.lon?.toFixed(2)}
          </p>

          {/* Icon + Temp */}
          <div className="flex items-center justify-between mb-6">
            {current?.icon && (
              <img src={current.icon} className="w-16 h-16" />
            )}

            <div className="text-right">
              <p className="text-4xl font-bold text-blue-600">
                {current?.temperature ?? "--"}°C
              </p>
              <p className="text-gray-500 text-sm">
                Feels {hourly?.feels_like ?? "--"}°C
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-gray-500">Humidity</p>
              <p className="font-semibold">
                {hourly?.humidity ?? "--"}%
              </p>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-gray-500">Wind</p>
              <p className="font-semibold">
                {current?.wind_speed ?? "--"} km/h
              </p>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-gray-500">UV Index</p>
              <p className="font-semibold">
                {hourly?.uv_index ?? "--"}
              </p>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-gray-500">Condition</p>
              <p className="font-semibold">
                {hourly?.condition_code ?? "--"}
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default App;
const BASE_URL = "https://weather-dashboard-7jt7.onrender.com";

export const getWeather = async (city) => {
  const res = await fetch(`${BASE_URL}/weather?city=${encodeURIComponent(city)}`);

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || "Failed to fetch weather");
  }

  return res.json();
};
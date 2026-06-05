const BASE_URL = import.meta.env.VITE_API_URL;

export const getWeather = async (city) => {
  const res = await fetch(`${BASE_URL}/weather?city=${city}`);

  if (!res.ok) {
    throw new Error("Failed to fetch weather");
  }

  return res.json();
};
import axios from 'axios';

const OPENWEATHER_API_KEY = 'YOUR_OPENWEATHER_API_KEY_HERE';

export const getWeatherData = async (lat, lon) => {
  try {
    // Fetch Current Weather (Temp, Humidity, Pressure, Rain)
    const weatherRes = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    
    // Fetch Air Pollution (AQI)
    const aqiRes = await axios.get(
      `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`
    );

    return {
      weather: weatherRes.data,
      aqi: aqiRes.data.list[0].main.aqi
    };
  } catch (error) {
    console.error('Error fetching environmental data:', error);
    return null;
  }
};

export const calculateFloodRisk = (weatherData, aqi) => {
  if (!weatherData) return { level: 'SAFE', color: '#10b981', desc: 'Awaiting data' };

  const rain = weatherData.rain ? (weatherData.rain['1h'] || weatherData.rain['3h'] || 0) : 0;
  const pressure = weatherData.main.pressure; // standard is 1013 hPa
  const humidity = weatherData.main.humidity;
  const isStorm = weatherData.weather[0].main === 'Thunderstorm';

  let riskScore = 0;

  // Rainfall is the primary indicator
  if (rain > 15) riskScore += 50;
  else if (rain > 5) riskScore += 25;
  else if (rain > 0) riskScore += 10;

  // Low pressure indicates storm systems
  if (pressure < 1000) riskScore += 20;
  else if (pressure < 1008) riskScore += 10;

  // High humidity supports heavy precipitation
  if (humidity > 90) riskScore += 15;
  else if (humidity > 80) riskScore += 5;

  // Storm condition overrides
  if (isStorm) riskScore += 30;

  // AQI doesn't cause floods, but poor AQI + floods = complex disaster (add small multiplier or just log it)

  if (riskScore >= 45) {
    return { level: 'DANGER', color: '#ef4444', desc: 'Critical Risk: Heavy rain and low pressure detected. Evacuate low areas.' };
  } else if (riskScore >= 20) {
    return { level: 'WARNING', color: '#f59e0b', desc: 'Moderate Risk: Conditions are favorable for localized flooding.' };
  } else {
    return { level: 'SAFE', color: '#10b981', desc: 'Low Risk: Environmental parameters are stable.' };
  }
};

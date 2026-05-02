/**
 * Real Weather Script for GTA IV
 * This script fetches the player's real-world location and weather,
 * then applies the corresponding weather and time in GTA IV.
 * * It uses the Open-Meteo API for weather data and timeapi.io for local time.
 * * Note: This script requires an internet connection to function.
 */
import {httpGet} from "./libs/HTTP";

const enabled = false;

if (!enabled) {
    exit("RealWeather script is disabled. Set 'enabled' to true to run.");
}

(async () => {
    try {
        if (!enabled) return;

        log("Starting RealWeather script...");

        // Step 1: Get player IP-based location and timezone
        await wait(2000);
        const geoResponse = await httpGet("https://ipapi.co/json/");
        const geo = JSON.parse(geoResponse);
        const latitude = geo.latitude;
        const longitude = geo.longitude;
        const timezone = geo.timezone;
        log(`Detected player location: ${latitude}, ${longitude}`);
        log(`Detected timezone: ${timezone}`);

        // Step 2: Get real-time weather
        await wait(2000);
        const weatherResponse = await httpGet(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weathercode`
        );
        const weather = JSON.parse(weatherResponse);
        const weatherCode = weather.current.weathercode;
        log(`Detected real weather code: ${weatherCode}`);

        // Step 3: Map to GTA IV weather and apply
        const gtaWeatherId = mapWeatherCodeToGTA(weatherCode);
        log(`Applying GTA weather ID: ${gtaWeatherId}`);
        Weather.Force(gtaWeatherId);

        // Step 4: Get real local time using timezone (using timeapi.io)
        await wait(2000);
        const timeResponse = await httpGet(`https://timeapi.io/api/Time/current/zone?timeZone=${timezone}`);
        const timeData = JSON.parse(timeResponse);
        const hour = timeData.hour;
        const minute = timeData.minute;
        log(`Setting GTA time to ${hour}:${minute}`);
        Clock.SetTimeOfDay(hour, minute);
    } catch (e) {
        log("Error:", e.toString());
        exit("Something went wrong with weather/time fetching");
    }
})();

function mapWeatherCodeToGTA(code: number): number {
    if ([0].includes(code)) return 0; // Extra Sunny
    if ([1, 2].includes(code)) return 1; // Sunny
    if ([3].includes(code)) return 6; // Cloudy
    if ([45, 48].includes(code)) return 4; // Foggy
    if ([51, 53, 55, 56, 57].includes(code)) return 5; // Light Rain
    if ([61, 63, 65, 66, 67].includes(code)) return 3; // Rainy
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 2; // Overcast
    if ([95, 96, 99].includes(code)) return 7; // Windy Light
    return 1; // Default => Sunny
}

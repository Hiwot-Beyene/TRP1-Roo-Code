/**
 * Weather response type definitions.
 */

/**
 * Represents a weather response from a weather API.
 */
export interface WeatherResponse {
	/**
	 * The name of the city for which the weather is reported.
	 */
	city: string

	/**
	 * The temperature in degrees Celsius.
	 */
	tempC: number

	/**
	 * A description of the current weather conditions.
	 */
	conditions: string
}

/**
 * Returns a placeholder weather result for the given city.
 * @param city - The name of the city to get weather for
 * @returns A WeatherResponse object with placeholder data
 */
export function getPlaceholderWeather(city: string): WeatherResponse {
	return {
		city,
		tempC: 20 + Math.floor(Math.random() * 15), // Random temperature between 20-34°C
		conditions: "Partly cloudy", // Placeholder condition
	}
}

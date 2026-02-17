// Reverse geocode coordinates to a place name using Expo Location
import * as Location from 'expo-location';

export async function reverseGeocode(latitude, longitude) {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });

    if (results && results.length > 0) {
      const r = results[0];
      // Build a readable place name from components
      const parts = [];
      if (r.name && r.name !== r.street) parts.push(r.name);
      if (r.street) parts.push(r.street);
      if (r.subregion) parts.push(r.subregion);
      if (r.city) parts.push(r.city);
      if (r.region) parts.push(r.region);

      // Remove duplicates while preserving order
      const unique = [...new Set(parts)];
      if (unique.length > 0) return unique.join(', ');

      // Fallback: try formattedAddress if available
      if (r.formattedAddress) return r.formattedAddress;
    }

    return null;
  } catch (err) {
    console.log('Reverse geocode error:', err);
    return null;
  }
}

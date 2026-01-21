import axios from "axios";

/**
 * Resolve human-readable location from IP
 * Handles:
 * - localhost
 * - private IPs
 * - proxy setups
 * - API failures
 */
export const getLocationFromIp = async (ip?: string): Promise<string> => {
  try {
    if (!ip) {
      return "Unknown location";
    }

    // Normalize IPv6 localhost
    if (ip === "::1") {
      return "Localhost";
    }

    // Remove IPv6 prefix like ::ffff:127.0.0.1
    const normalizedIp = ip.replace("::ffff:", "");

    // Private / local network IPs
    const isPrivateIp =
      normalizedIp.startsWith("127.") ||
      normalizedIp.startsWith("10.") ||
      normalizedIp.startsWith("192.168.") ||
      normalizedIp.startsWith("172.16.") ||
      normalizedIp.startsWith("172.17.") ||
      normalizedIp.startsWith("172.18.") ||
      normalizedIp.startsWith("172.19.") ||
      normalizedIp.startsWith("172.2");

    if (isPrivateIp) {
      return "Local Network";
    }

    // 🌍 Public IP → Geo lookup
    const res = await axios.get(
      `https://ipapi.co/${normalizedIp}/json/`,
      { timeout: 5000 }
    );

    const {
      city,
      region,
      country_name,
    } = res.data || {};

    if (city && country_name) {
      return `${city}, ${country_name}`;
    }

    if (region && country_name) {
      return `${region}, ${country_name}`;
    }

    return country_name || "Unknown location";
  } catch (error) {
    console.error("IP LOCATION ERROR:", error);
    return "Unknown location";
  }
};

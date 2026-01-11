export const parseDevice = (userAgent: string) => {
  const ua = userAgent.toLowerCase();

  let os = "Unknown OS";
  let browser = "Unknown Browser";

  // OS
  if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone")) os = "iPhone";
  else if (ua.includes("ipad")) os = "iPad";
  else if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac")) os = "Mac";

  // Browser
  if (ua.includes("chrome") && !ua.includes("edg"))
    browser = "Chrome";
  else if (ua.includes("safari") && !ua.includes("chrome"))
    browser = "Safari";
  else if (ua.includes("firefox"))
    browser = "Firefox";
  else if (ua.includes("edg"))
    browser = "Edge";

  return `${os} • ${browser}`;
};

const defaultPort = 4000;

function parsePort(value) {
  if (value === undefined) {
    return defaultPort;
  }

  if (value.trim() === "") {
    throw new Error("PORT must be an integer between 0 and 65535");
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("PORT must be an integer between 0 and 65535");
  }

  return port;
}

export function loadConfig(env = process.env) {
  const apiToken = env.API_TOKEN?.trim();

  if (!apiToken) {
    throw new Error("API_TOKEN is required");
  }

  return Object.freeze({
    apiToken,
    port: parsePort(env.PORT),
  });
}

const redis = require("redis");

//Configuring ENV
const dotenv = require("dotenv");
dotenv.config();

module.exports.connectRedis = async () => {
  const RedisRetryStrategy = (options) => {
    if (options.error && options.error.code === "ECONNREFUSED") {
      return new Error("The server refused the connection");
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error("Retry time exhausted");
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  };

  const cacheHostName = process.env.CACHE_FOR_REDIS_HOST_NAME;
  const cachePassword = process.env.CACHE_FOR_REDIS_ACCESS_KEY;

  if (!cacheHostName) throw Error("CACHE_FOR_REDIS_HOST_NAME is empty");
  if (!cachePassword) throw Error("CACHE_FOR_REDIS_ACCESS_KEY is empty");

  const cacheConnection = redis.createClient({
    password: cachePassword,
    socket: {
      host: cacheHostName,
      port: 11065,
      reconnectStrategy: RedisRetryStrategy,
    },
  });

  cacheConnection.on("error", (err) => {
    console.error("Redis connection error:", err);
  });

  cacheConnection.on("connect", () => {
    console.log("Redis client connected");
  });

  cacheConnection.on("ready", () => {
    console.log("Redis client ready");
  });

  await cacheConnection.connect();
  console.log("Redis Server Connected!");

  return cacheConnection;
};

const { exec } = require("child_process");
const { connectRedis } = require("./config/redis");
let cacheConnection;

//Connect to Redis
async function redisConnect() {
  try {
    cacheConnection = await connectRedis();
  } catch (error) {
    console.error("Failed to connect to redis", error);
  }
}

// Immediately invoking the redisConnect function
(async () => {
  await redisConnect();
})();

/**
 * @description Restarting Server after 5 Sec
 * @type Funtion
 * @input
 * @returns
 */
setInterval(async () => {
  let restartNeeded = "false";

  try {
    restartNeeded = await cacheConnection.get("RESTART_SERVER");
    console.log("Inside Monitor", restartNeeded);
  } catch (err) {
    console.error("Failed to get RESTART_SERVER from Redis:", err);
  }

  if (restartNeeded === "true") {
    console.log("Restarting server...");
    exec("pm2 restart my-app", (err, stdout, stderr) => {
      if (err) {
        console.error(`Error restarting server: ${err.message}`);
        return;
      }
      console.log(`Server restarted: ${stdout}`);

      // Reset the restart flag in Redis
      cacheConnection.set("RESTART_SERVER", "false").catch((error) => {
        console.error("Failed to reset RESTART_SERVER in Redis:", error);
      });
    });
  } else {
    console.log("No restart needed...");
  }
}, 5000);

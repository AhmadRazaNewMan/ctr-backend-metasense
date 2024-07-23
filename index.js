const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const app = express();
const path = require("path");
const { fork } = require("child_process");

//Queues
const documentQueue = require("./queues/documentQueue");

//Connect Redis
const { connectRedis } = require("./config/redis");
let cacheConnection;

// Function to restart the server
async function restartServer() {
  try {
    cacheConnection = await connectRedis();
    await cacheConnection.set("RESTART_SERVER", "false");
    console.log("Setting RESTART_SERVER to false in Redis");
  } catch (error) {
    console.error("Failed to set RESTART_SERVER in Redis:", error);
  }
}

// Immediately invoking the restartServer function
(async () => {
  await restartServer();
})();

// Fork the monitoring process
const monitorScript = path.join(__dirname, "monitor.js");
fork(monitorScript);

//Project files and routes
const apiRouter = require("./routes");

// Middlewares
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ limit: "500mb", extended: true }));

//CORS
const corsOptions = {
  origin: [
    "http://localhost:3000",
    // "https://cti-user.vercel.app",
    // "https://cti-admin.vercel.app",
  ],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

//Configuring ENV
dotenv.config();

//Connecting routes
app.use("/api", apiRouter);

//Clean-Up
const gracefulShutdown = () => {
  console.log("Shutting down gracefully...");
  cacheConnection.quit();
  documentQueue.close().then(() => {
    console.log("Bull queue closed");
    process.exit(0);
  });
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Connect Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Your app is running on PORT ${PORT}`);
  
});

server.setTimeout(50 * 60 * 1000);

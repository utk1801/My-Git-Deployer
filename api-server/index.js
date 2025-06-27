const express = require("express");
const { generateSlug } = require("random-word-slugs");
const { Server } = require("socket.io");
const Redis = require("ioredis");
const { spawn } = require("child_process");
require("dotenv").config();
const cors = require("cors");

const app = express();
const PORT = 9000;
let projectSlug = "undefined";
const redisUrl = process.env.REDIS_AIVEN_URL;

const subscriber = new Redis(redisUrl);

const io = new Server({ cors: "*" });
app.use(cors());

io.on("connection", (socket) => {
  socket.on("subscribe", (channel) => {
    socket.join(channel);
    socket.emit("message", `Joined ${channel}`);
  });
});

io.listen(9002, () => console.log("Socket Server 9002"));

app.use(express.json());

app.post("/project", async (req, res) => {
  const { gitUrl, slug } = req.body;
  projectSlug = slug ? slug : generateSlug();
  console.log(`Using project slug as ${projectSlug}`);

  const accessKeyId = process.env.ACCESS_KEY_ID;
  const secretAccessKey = process.env.SECRET_ACCESS_KEY;
  const dockerImageName = process.env.DOCKER_IMAGE;

  console.log(`${accessKeyId}_${secretAccessKey}_${dockerImageName}`);

  await runDockerImageAsync(
    dockerImageName,
    gitUrl,
    projectSlug,
    accessKeyId,
    secretAccessKey
  );

  return res.json({
    status: "queued",
    data: { projectSlug, url: `http://${projectSlug}.localhost:8000` },
  });
});

async function runDockerImageAsync(
  dockerImage,
  gitUrl,
  projectSlug,
  accessKeyId,
  secretAccessKey
) {
  console.log(`Docker image name : ${dockerImage}`);

  const containerName = projectSlug; //set docker container name as generatedSlug.
  //Command to run a container and automatically remove it on exit.
  const dockerArgs = [
    "run",
    "--rm", //This flag ensures automatic container removal upon exit.
    "--name",
    containerName,
    "-e",
    `GIT_REPOSITORY__URL=${gitUrl}`,
    "-e",
    `PROJECT_ID=${projectSlug}`,
    "-e",
    `AWS_ACCESS_KEY_ID=${accessKeyId}`,
    "-e",
    `AWS_SECRET_ACCESS_KEY=${secretAccessKey}`,
    "-e",
    `REDIS_AIVEN_URL=${redisUrl}`,
    dockerImage,
  ];

  console.log(`Attempting to run Docker image: ${dockerImage}`);

  const dockerProcess = spawn("docker", dockerArgs);

  dockerProcess.stdout.on("data", (data) => {
    console.log(`Docker stdout: ${data}`);
  });

  dockerProcess.stderr.on("data", (data) => {
    console.error(`Docker stderr: ${data}`);
  });

  dockerProcess.on("close", (code) => {
    if (code === 0) {
      console.log(`Docker container "${dockerImage}" started successfully.`);
    } else {
      console.error(
        `Docker process exited with code ${code}. Failed to start container.`
      );
    }
  });

  dockerProcess.on("error", (err) => {
    console.error(`Failed to start Docker process: ${err.message}`);
  });
}

async function initRedisSubscribe() {
  console.log("Subscribed to logs....");
  subscriber.psubscribe("logs:*");
  subscriber.on("pmessage", (pattern, channel, message) => {
    io.to(channel).emit("message", message);
  });
}

initRedisSubscribe();

app.listen(PORT, () => console.log(`API Server Running..${PORT}`));

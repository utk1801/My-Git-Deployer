const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");
const Redis = require("ioredis");
const { url } = require("inspector");
require("dotenv").config();

const publisher = new Redis(process.env.REDIS_AIVEN_URL);

const s3Client = new S3Client({
  region: "us-west-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const PROJECT_ID = process.env.PROJECT_ID; //import value from inside docker container's .env

init(PROJECT_ID);

function publishLog(log) {
  publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify({ log }));
}

async function init(projectId) {
  console.log("Executing script.js");
  console.log(`SLUG_NAME from api server: ${projectId}`);
  publishLog("Build Started...");
  const outDirPath = path.join(__dirname, "output");

  const p = exec(`cd ${outDirPath} && npm install && npm run build`);

  p.stdout.on("data", function (data) {
    console.log(data.toString());
    publishLog(data.toString());
  });

  p.stderr.on("error", function (data) {
    console.log("Error", data.toString());
    publishLog(`error: ${data.toString()}`);
  });

  p.on("close", async function () {
    console.log("Build Complete");
    publishLog(`Build Complete`);
    const distFolderPath = path.join(__dirname, "output", "dist");
    const distFolderContents = fs.readdirSync(distFolderPath, {
      recursive: true,
    });

    publishLog(`Starting to upload`);
    for (const file of distFolderContents) {
      const filePath = path.join(distFolderPath, file);
      if (fs.lstatSync(filePath).isDirectory()) continue;

      console.log("uploading", filePath);
      publishLog(`uploading ${file}`);

      const command = new PutObjectCommand({
        Bucket: "vercel-git-builder-files",
        Key: `__outputs/${PROJECT_ID}/${file}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath),
      });

      await s3Client.send(command);
      publishLog(`uploaded ${file}`);
      console.log("uploaded", filePath);
    }
    publishLog(
      `Done.. You may now view the deployed GIT project at above mentioned URL}`
    );
    console.log("Done...");
    process.exit(0);
  });
}

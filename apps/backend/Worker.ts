import { createClient } from "redis";
import { evaluateInterview } from "./src/index.js";
const Redis = createClient({
  url: process.env.REDIS_URL!,
});

Redis.on("error", (error) => {
  console.error("Redis Error:", error);
});

await Redis.connect();

console.log("Worker started");

while (true) {
  const job = await Redis.blPop(
    "Interview_queue",
    0
  );

  if (!job) continue;

  const data = JSON.parse(job.element);

  console.log(
    "Processing interview:",
    data.id
  );

  try {
    await evaluateInterview(data.id);

    console.log(
      "Evaluation completed:",
      data.id
    );
  } catch (error) {
    console.error(
      "Evaluation failed:",
      data.id,
      error
    );
  }
}
import { createServer } from "http";
import { env } from "./config/index.js";
import { createApp } from "./app.js";
import { initSocketServer } from "./socket/index.js";
import { recoverStuckReviews } from "./upload/moderationQueue.js";

const app = createApp();
const httpServer = createServer(app);

initSocketServer(httpServer);

const port = Number(env.PORT);
httpServer.listen(port, () => {
  console.log(`Silent Review API listening on http://localhost:${port}`);
  // Re-enqueue reviews stranded in UNDER_REVIEW by previous restarts.
  void recoverStuckReviews();
});

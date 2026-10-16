import { env } from "./config/env.js";
import { app } from "./app.js";

import { reclaimAbandonedResearchJobs } from "./db/repositories/researchJob.repository.js";

const server = app.listen(env.PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
  console.log(`📡 Health check available at http://localhost:${env.PORT}/api/health`);

  // Recover any jobs left in 'researching' state prior to this restart
  await reclaimAbandonedResearchJobs().catch(() => null);
});

// Graceful shutdown
function shutdown() {
  console.log("Shutting down server gracefully...");
  server.close(() => {
    console.log("Server stopped.");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

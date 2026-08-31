import app from "./app.js";
import env from "./config/env.js";
import { startMandiScheduler } from "./services/mandi-scheduler.js";

const start = async () => {
  try {
    await app.listen({
      port: env.PORT,
      host: "0.0.0.0",
    });

    console.log(`KrishiGuard backend running on port ${env.PORT}`);

    // Started here (not app.ts) so the test suite, which imports app.ts
    // directly, never triggers a real mandi sync against data.gov.in.
    startMandiScheduler();
  }
  catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();

import { createCallerFactory, router } from "./init";
import { activityRouter } from "./routers/activity";
import { flowRouter } from "./routers/flow";
import { shareRouter } from "./routers/share";
import { versionRouter } from "./routers/version";

export const appRouter = router({ flow: flowRouter, share: shareRouter, version: versionRouter, activity: activityRouter });
export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);

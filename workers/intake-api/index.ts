import { handleIntakeApiRequest } from "../../src/features/intake/intake.routes";
import type { IntakeApiEnv } from "../../src/features/intake/intake.types";

export default {
  fetch(request: Request, env: IntakeApiEnv): Promise<Response> {
    return handleIntakeApiRequest(request, env);
  },
};

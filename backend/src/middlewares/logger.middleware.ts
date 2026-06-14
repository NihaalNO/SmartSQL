import morgan from "morgan";
import { logger } from "../utils/logger";

/**
 * Morgan request logger that pipes through Winston with a compact format.
 */
export const requestLogger = morgan("combined", {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    },
  },
});

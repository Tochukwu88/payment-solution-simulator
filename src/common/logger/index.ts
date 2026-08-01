import { AppLogger } from "./appLogger";
import { WinstonLoggerDriver } from "./winstonLoggerDriver";

export const logger = new AppLogger(new WinstonLoggerDriver());

export { AppLogger } from "./appLogger";
export { WinstonLoggerDriver } from "./winstonLoggerDriver";

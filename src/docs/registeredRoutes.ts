import { HttpStatus } from "../constants/responseMessages";
import { registerApiRoute } from "./registerApiRoute";

registerApiRoute({
  method: "get",
  path: "/",
  summary: "Health check",
  tags: ["General"],
  successDescription: "Server is up and running",
  errorStatuses: [
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.INTERNAL_SERVER_ERROR,
  ],
});

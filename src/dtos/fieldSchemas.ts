import { z } from "zod";

export function requiredString(field: string) {
  return z.string({
    error: (issue) =>
      issue.input === undefined
        ? `${field} is required`
        : `${field} must be a string`,
  });
}

export function optionalString(field: string) {
  return z.string(`${field} must be a string`);
}

export function requiredNumber(field: string) {
  return z.number({
    error: (issue) =>
      issue.input === undefined
        ? `${field} is required`
        : `${field} must be a number`,
  });
}

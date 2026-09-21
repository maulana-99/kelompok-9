/**
 * Error contract shared by every transport (REST routes and Server Actions).
 * Pure and dependency-free so both client and server modules can import it.
 */

export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "USERNAME_TAKEN"
  | "INVALID_CREDENTIALS"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR";

export type FieldErrors = {
  username?: string;
  password?: string;
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  /** HTTP status the transport should answer with. */
  readonly status: number;
  readonly fieldErrors?: FieldErrors;

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  static badRequest(message: string): ApiError {
    return new ApiError("BAD_REQUEST", message, 400);
  }

  static validation(fieldErrors: FieldErrors): ApiError {
    return new ApiError(
      "VALIDATION_ERROR",
      "Some fields need your attention.",
      422,
      fieldErrors,
    );
  }

  /** 409: the username is already registered. */
  static usernameTaken(): ApiError {
    return new ApiError(
      "USERNAME_TAKEN",
      "That username is already taken. Please pick another.",
      409,
    );
  }

  /** 401: wrong username or password. Deliberately does not say which. */
  static invalidCredentials(): ApiError {
    return new ApiError(
      "INVALID_CREDENTIALS",
      "Incorrect username or password.",
      401,
    );
  }

  static unauthorized(): ApiError {
    return new ApiError("UNAUTHORIZED", "You must sign in first.", 401);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

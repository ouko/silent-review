/**
 * Convert backend/network errors into short, user-friendly messages.
 *
 * The API may return raw Zod/validation strings in development; this helper
 * shields users from technical jargon and keeps the tone consistent across
 * the app.
 */

interface ErrorResponse {
  error?: string;
  message?: string;
  details?: string[];
  issues?: Array<{ path: string[]; message: string }>;
}

const GENERIC = "Something went wrong. Please try again in a moment.";
const NETWORK = "Couldn’t connect. Check your internet and try again.";

const KNOWN_MESSAGES: Array<[string | RegExp, string]> = [
  ["Invalid credentials", "The email or password you entered is incorrect."],
  ["Email or username already taken", "That email or username is already in use."],
  ["No file uploaded", "Please select a video to upload."],
  ["Only video files are allowed", "Please upload a video file."],
  ["Video validation failed", "This video doesn’t meet our requirements. It should be a silent 5-second MP4, MOV, or WebM under 20 MB."],
  ["File size exceeds", "Video must be smaller than 20 MB."],
  ["Duration must be", "Video must be about 5 seconds long."],
  ["Audio track detected", "Videos must be silent (no audio track)."],
  ["No video stream found", "We couldn’t read that video. Please try another file."],
  ["Video moderation failed", "This video couldn’t be uploaded because it may violate community guidelines."],
  ["content violates community guidelines", "This video couldn’t be uploaded because it may violate community guidelines."],
  [/format .* is not allowed/i, "Please upload an MP4, MOV, or WebM video."],
  ["Validation error", "Please check the highlighted fields and try again."],
];

function mapKnownError(raw: string): string | undefined {
  const lower = raw.toLowerCase();
  for (const [pattern, friendly] of KNOWN_MESSAGES) {
    if (typeof pattern === "string") {
      if (lower.includes(pattern.toLowerCase())) return friendly;
    } else if (pattern.test(raw)) {
      return friendly;
    }
  }
  return undefined;
}

function formatIssues(issues: ErrorResponse["issues"]): string {
  if (!issues || issues.length === 0) return GENERIC;
  return issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}

function getResponseData(err: unknown): ErrorResponse | undefined {
  if (!err || typeof err !== "object") return undefined;
  const maybe = err as { response?: { data?: ErrorResponse; statusText?: string; status?: number } };
  return maybe.response?.data;
}

export function formatUserError(err: unknown): string {
  if (!err) return GENERIC;

  // Network errors (no response object).
  if (typeof err === "object" && "request" in err && !("response" in err)) {
    return NETWORK;
  }

  const data = getResponseData(err);
  if (data) {
    if (data.issues && data.issues.length > 0) {
      return formatIssues(data.issues);
    }
    if (data.details && data.details.length > 0) {
      const joined = data.details.join("; ");
      return mapKnownError(joined) || joined;
    }
    const raw = data.error || data.message;
    if (raw) {
      return mapKnownError(raw) || raw;
    }
    const statusText = (err as { response?: { statusText?: string } }).response?.statusText;
    if (statusText) return statusText;
  }

  if (err instanceof Error) {
    if (err.message === "Network Error" || err.message.includes("fetch")) return NETWORK;
    return err.message;
  }

  return GENERIC;
}

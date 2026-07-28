import { describe, it, expect } from "vitest";
import { formatUserError } from "../errors";

describe("formatUserError", () => {
  it("returns a generic message for unknown errors", () => {
    expect(formatUserError(new Error("boom"))).toBe("boom");
  });

  it("maps validation issues to field-level messages", () => {
    const err = {
      response: {
        data: {
          issues: [
            { path: ["duration"], message: "Must be 5s" },
            { path: ["videoUrl"], message: "Required" },
          ],
        },
      },
    };
    expect(formatUserError(err)).toBe("duration: Must be 5s; videoUrl: Required");
  });

  it("maps known backend strings to friendly messages", () => {
    const err = { response: { data: { error: "Invalid credentials" } } };
    expect(formatUserError(err)).toBe("The email or password you entered is incorrect.");
  });

  it("maps video validation failures to a friendly message", () => {
    const err = { response: { data: { error: "Video validation failed" } } };
    expect(formatUserError(err)).toContain("5-second");
  });

  it("returns a network message for network errors", () => {
    const err = { request: {}, message: "Network Error" };
    expect(formatUserError(err)).toBe("Couldn’t connect. Check your internet and try again.");
  });
});

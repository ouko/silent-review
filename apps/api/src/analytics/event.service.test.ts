import { jest, describe, it, expect, beforeEach } from "@jest/globals";

const mockCreateMany = jest.fn() as jest.Mock<(...args: any[]) => Promise<{ count: number }>>;

const mockPrisma = {
  event: { createMany: mockCreateMany },
};

jest.unstable_mockModule("../prisma.js", () => ({ prisma: mockPrisma }));

const mockIsFeatureEnabled = jest.fn() as jest.Mock<(...args: any[]) => Promise<boolean>>;
const mockGetFeatureFlag = jest.fn() as jest.Mock<(...args: any[]) => Promise<any>>;
jest.unstable_mockModule("../features/features.service.js", () => ({
  isFeatureEnabled: mockIsFeatureEnabled,
  getFeatureFlag: mockGetFeatureFlag,
}));

const { ingestEvents } = await import("./event.service.js");

describe("ingestEvents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateMany.mockResolvedValue({ count: 0 });
    mockGetFeatureFlag.mockResolvedValue(undefined);
  });

  it("stores nothing when the analytics feature flag is disabled", async () => {
    mockIsFeatureEnabled.mockResolvedValue(false);
    const result = await ingestEvents([{ type: "app_open", userId: "u1", sessionId: "s1" }]);
    expect(result.stored).toBe(0);
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it("stores valid events when analytics is enabled", async () => {
    mockIsFeatureEnabled.mockResolvedValue(true);
    mockGetFeatureFlag.mockResolvedValue({ key: "analytics", enabled: true, rules: {} });
    mockCreateMany.mockResolvedValue({ count: 2 });

    const result = await ingestEvents([
      { type: "app_open", userId: "u1", sessionId: "s1", channel: "organic" },
      { type: "guess_submitted", userId: "u1", sessionId: "s1", channel: "challenge_link" },
    ]);

    expect(result.stored).toBe(2);
    expect(mockCreateMany).toHaveBeenCalledTimes(1);
    const data = mockCreateMany.mock.calls[0][0].data;
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({ type: "app_open", userId: "u1", channel: "organic" });
    expect(data[1]).toMatchObject({ type: "guess_submitted", userId: "u1", channel: "challenge_link" });
  });

  it("drops unknown event types and normalizes channels", async () => {
    mockIsFeatureEnabled.mockResolvedValue(true);
    mockGetFeatureFlag.mockResolvedValue({ key: "analytics", enabled: true, rules: {} });
    mockCreateMany.mockResolvedValue({ count: 1 });

    const result = await ingestEvents([
      { type: "app_open", userId: "u1", sessionId: "s1", channel: "evil_channel" },
      { type: "unknown_event", userId: "u1", sessionId: "s1" },
    ]);

    expect(result.stored).toBe(1);
    const data = mockCreateMany.mock.calls[0][0].data;
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ type: "app_open", channel: "organic" });
  });

  it("applies sampleRate from feature flag rules", async () => {
    mockIsFeatureEnabled.mockResolvedValue(true);
    mockGetFeatureFlag.mockResolvedValue({ key: "analytics", enabled: true, rules: { sampleRate: 0 } });

    const result = await ingestEvents([{ type: "app_open", userId: "u1", sessionId: "s1" }]);

    expect(result.stored).toBe(0);
    expect(mockCreateMany).not.toHaveBeenCalled();
  });
});

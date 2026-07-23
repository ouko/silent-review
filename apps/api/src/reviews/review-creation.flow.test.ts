import { jest } from "@jest/globals";

const mockPrisma: any = {
  review: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
};

jest.unstable_mockModule("../prisma.js", () => ({
  prisma: mockPrisma,
}));

const { createReview } = await import("./reviews.service.js");

describe("createReview flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a new review when none exists for the user/product", async () => {
    const input = {
      productId: "p1",
      videoUrl: "https://example.com/v.mp4",
      duration: 5,
      format: "video/mp4",
      rating: 8,
      caption: "Great!",
    };
    const created = { id: "r1", ...input, userId: "u1" };
    mockPrisma.review.findFirst.mockResolvedValue(null);
    mockPrisma.review.create.mockResolvedValue(created);

    const result = await createReview("u1", input);
    expect(result.id).toBe("r1");
    expect(mockPrisma.review.create).toHaveBeenCalled();
  });

  it("updates an existing review instead of duplicating", async () => {
    const input = {
      productId: "p1",
      videoUrl: "https://example.com/v2.mp4",
      duration: 5,
      format: "video/mp4",
      rating: 9,
      caption: "Updated",
    };
    const existing = { id: "r1", productId: "p1", userId: "u1" };
    mockPrisma.review.findFirst.mockResolvedValue(existing);
    mockPrisma.review.update.mockResolvedValue({ id: "r1", ...input, userId: "u1" });

    await createReview("u1", input);
    expect(mockPrisma.review.update).toHaveBeenCalled();
    expect(mockPrisma.review.create).not.toHaveBeenCalled();
  });
});

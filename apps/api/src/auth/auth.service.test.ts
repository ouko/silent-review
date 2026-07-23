import { jest } from "@jest/globals";
import type { AuthProvider, ProviderProfile } from "@silent-review/shared";

const mockPrisma: any = {
  oAuthAccount: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
  },
};

jest.unstable_mockModule("../prisma.js", () => ({
  prisma: mockPrisma,
}));

const {
  AuthService,
  createRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  toSafeUser,
} = await import("./auth.service.js");

function createMockProvider(
  id: string,
  available = true,
  profile: ProviderProfile = {
    providerId: "p123",
    email: "test@example.com",
    displayName: "Test User",
    avatarUrl: null,
  }
): AuthProvider {
  return {
    id: id as AuthProvider["id"],
    label: id,
    isAvailable: () => available,
    authenticate: jest.fn<() => Promise<ProviderProfile>>().mockResolvedValue(profile),
  };
}

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("provider registration", () => {
    it("lists only available providers", () => {
      const service = new AuthService();
      const google = createMockProvider("google", true);
      const apple = createMockProvider("apple", false);
      service.register(google);
      service.register(apple);

      expect(service.listAvailableProviders()).toEqual([google]);
    });

    it("returns undefined for unregistered provider", () => {
      const service = new AuthService();
      expect(service.getProvider("google")).toBeUndefined();
    });
  });

  describe("authenticate", () => {
    it("links a new OAuth account to an existing user with matching email", async () => {
      const service = new AuthService();
      const profile: ProviderProfile = {
        providerId: "p123",
        email: "existing@example.com",
        displayName: "Existing User",
        avatarUrl: null,
      };
      const google = createMockProvider("google", true, profile);
      service.register(google);

      const existingUser = {
        id: "u1",
        email: "existing@example.com",
        username: "existing",
        displayName: null,
        avatarUrl: null,
        role: "USER",
        createdAt: new Date(),
      };

      mockPrisma.oAuthAccount.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.oAuthAccount.create.mockResolvedValue({ id: "acc1" });

      const result = await service.authenticate("google", { code: "abc" });

      expect(result.isNewUser).toBe(false);
      expect(result.user.id).toBe("u1");
      expect(result.providerAccountId).toBe("p123");
      expect(mockPrisma.oAuthAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: "u1", provider: "google", providerId: "p123" }),
        })
      );
    });

    it("creates a new user when no OAuth link or email match exists", async () => {
      const service = new AuthService();
      const profile: ProviderProfile = {
        providerId: "p456",
        email: "new@example.com",
        displayName: "New User",
        avatarUrl: null,
      };
      const google = createMockProvider("google", true, profile);
      service.register(google);

      const newUser = {
        id: "u2",
        email: "new@example.com",
        username: "newuser",
        displayName: "New User",
        avatarUrl: null,
        role: "USER",
        createdAt: new Date(),
      };

      mockPrisma.oAuthAccount.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(newUser);
      mockPrisma.oAuthAccount.create.mockResolvedValue({ id: "acc2" });

      const result = await service.authenticate("google", { code: "abc" });

      expect(result.isNewUser).toBe(true);
      expect(result.user.id).toBe("u2");
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it("returns existing user when OAuth account is already linked", async () => {
      const service = new AuthService();
      const profile: ProviderProfile = {
        providerId: "p789",
        email: "linked@example.com",
        displayName: "Linked User",
        avatarUrl: null,
      };
      const google = createMockProvider("google", true, profile);
      service.register(google);

      const existingUser = {
        id: "u3",
        email: "linked@example.com",
        username: "linked",
        displayName: null,
        avatarUrl: null,
        role: "USER",
        createdAt: new Date(),
      };

      mockPrisma.oAuthAccount.findUnique.mockResolvedValue({
        id: "acc3",
        user: existingUser,
      });

      const result = await service.authenticate("google", { code: "abc" });

      expect(result.isNewUser).toBe(false);
      expect(result.user.id).toBe("u3");
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it("throws when provider is not available", async () => {
      const service = new AuthService();
      const google = createMockProvider("google", false);
      service.register(google);

      await expect(service.authenticate("google", {})).rejects.toThrow("not available");
    });

    it("throws when provider is not registered", async () => {
      const service = new AuthService();
      await expect(service.authenticate("google", {})).rejects.toThrow("Unknown provider");
    });
  });
});

describe("refresh token lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a refresh token and stores its hash", async () => {
    mockPrisma.refreshToken.create.mockResolvedValue({ id: "rt1" });

    const token = await createRefreshToken("u1");

    expect(token).toHaveLength(128);
    expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "u1" }),
      })
    );
  });

  it("verifies a valid refresh token and returns userId", async () => {
    const token = await createRefreshToken("u1");
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      tokenHash: expect.any(String),
      userId: "u1",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const userId = await verifyRefreshToken(token);
    expect(userId).toBe("u1");
  });

  it("returns null for an expired refresh token", async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      tokenHash: "hash",
      userId: "u1",
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    const userId = await verifyRefreshToken("some-token");
    expect(userId).toBeNull();
  });

  it("revokes a refresh token by hash", async () => {
    await revokeRefreshToken("some-token");
    expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalled();
  });

  it("revokes all refresh tokens for a user", async () => {
    await revokeAllUserRefreshTokens("u1");
    expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" } })
    );
  });
});

describe("toSafeUser", () => {
  it("returns a safe user with ISO date string", () => {
    const user = {
      id: "u1",
      email: "a@example.com",
      username: "alice",
      displayName: "Alice",
      avatarUrl: null,
      role: "USER",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
    };

    const safe = toSafeUser(user);
    expect(safe.id).toBe("u1");
    expect(safe.email).toBe("a@example.com");
    expect(safe.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });
});

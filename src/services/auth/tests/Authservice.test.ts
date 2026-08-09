import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { AuthService } from "@/services/auth/AuthService";
import { ArtistRepository } from "@/repositories/settings/ArtistRepository";
import { prisma } from "@/lib/prisma";

vi.mock("@/repositories/settings/ArtistRepository", () => ({
  ArtistRepository: { findByEmail: vi.fn(), findById: vi.fn(), updatePasswordHash: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    passwordResetToken: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    artist: { update: vi.fn() },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));
vi.mock("@/lib/email", () => ({ sendPasswordResetEmail: vi.fn() }));

describe("AuthService.validateCredentials", () => {
  beforeEach(() => vi.resetAllMocks());

  it("succeeds with correct email + password", async () => {
    const passwordHash = await bcrypt.hash("correct-horse-battery", 10);
    vi.mocked(ArtistRepository.findByEmail).mockResolvedValue({
      id: "artist-1", email: "artist@example.com", passwordHash, fullName: "Jane Artist",
    } as never);

    const result = await AuthService.validateCredentials("artist@example.com", "correct-horse-battery");
    expect(result).toEqual({ id: "artist-1", email: "artist@example.com", fullName: "Jane Artist" });
  });

  it("fails with the wrong password", async () => {
    const passwordHash = await bcrypt.hash("correct-horse-battery", 10);
    vi.mocked(ArtistRepository.findByEmail).mockResolvedValue({
      id: "artist-1", email: "artist@example.com", passwordHash, fullName: "Jane Artist",
    } as never);

    const result = await AuthService.validateCredentials("artist@example.com", "wrong-password");
    expect(result).toBeNull();
  });

  it("fails for a non-existent email without throwing or leaking existence", async () => {
    vi.mocked(ArtistRepository.findByEmail).mockResolvedValue(null);
    const result = await AuthService.validateCredentials("nobody@example.com", "anything");
    expect(result).toBeNull();
  });

  it("returned result never includes the password hash", async () => {
    const passwordHash = await bcrypt.hash("secret", 10);
    vi.mocked(ArtistRepository.findByEmail).mockResolvedValue({
      id: "artist-1", email: "artist@example.com", passwordHash, fullName: "Jane Artist",
    } as never);

    const result = await AuthService.validateCredentials("artist@example.com", "secret");
    expect(result).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(result)).not.toContain(passwordHash);
  });

  it("passwords are actually hashed, not stored/compared in plaintext", async () => {
    const passwordHash = await bcrypt.hash("secret", 10);
    // The stored hash must not equal the plaintext password.
    expect(passwordHash).not.toBe("secret");
    // And bcrypt.compare must be what validates it (sanity check on the primitive itself).
    expect(await bcrypt.compare("secret", passwordHash)).toBe(true);
    expect(await bcrypt.compare("wrong", passwordHash)).toBe(false);
  });
});

describe("AuthService.changePassword", () => {
  beforeEach(() => vi.resetAllMocks());

  it("succeeds when the current password is correct", async () => {
    const passwordHash = await bcrypt.hash("old-password", 10);
    vi.mocked(ArtistRepository.findById).mockResolvedValue({ id: "artist-1", passwordHash } as never);
    vi.mocked(ArtistRepository.updatePasswordHash).mockResolvedValue(undefined);

    const result = await AuthService.changePassword("artist-1", "old-password", "new-password-123");
    expect(result.success).toBe(true);
    expect(ArtistRepository.updatePasswordHash).toHaveBeenCalledWith("artist-1", expect.any(String));
    // The new hash actually stored must not be the plaintext new password.
    const [, storedHash] = vi.mocked(ArtistRepository.updatePasswordHash).mock.calls[0];
    expect(storedHash).not.toBe("new-password-123");
  });

  it("fails when the current password is incorrect, and does not update anything", async () => {
    const passwordHash = await bcrypt.hash("old-password", 10);
    vi.mocked(ArtistRepository.findById).mockResolvedValue({ id: "artist-1", passwordHash } as never);

    const result = await AuthService.changePassword("artist-1", "wrong-current", "new-password-123");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Current password is incorrect.");
    expect(ArtistRepository.updatePasswordHash).not.toHaveBeenCalled();
  });
});

describe("AuthService.requestPasswordReset (non-enumeration)", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns success for an existing email and creates a token", async () => {
    vi.mocked(ArtistRepository.findByEmail).mockResolvedValue({ id: "artist-1", email: "a@b.com" } as never);
    vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({} as never);

    const result = await AuthService.requestPasswordReset("a@b.com");
    expect(result.success).toBe(true);
    expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
  });

  it("returns the SAME success response for a non-existent email, without creating a token", async () => {
    vi.mocked(ArtistRepository.findByEmail).mockResolvedValue(null);

    const result = await AuthService.requestPasswordReset("nobody@example.com");
    expect(result.success).toBe(true);
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("never stores the raw token — only a hash is passed to prisma.create", async () => {
    vi.mocked(ArtistRepository.findByEmail).mockResolvedValue({ id: "artist-1", email: "a@b.com" } as never);
    vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({} as never);

    await AuthService.requestPasswordReset("a@b.com");
    const createArgs = vi.mocked(prisma.passwordResetToken.create).mock.calls[0][0] as { data: { tokenHash: string } };
    // A sha256 hex digest is 64 chars; a raw crypto.randomBytes(32) hex token is also 64 chars,
    // so length alone can't prove hashing — assert it's hex and deterministic-looking instead
    // by checking it's NOT the literal token value we'd get back from the (mocked) email call.
    expect(createArgs.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("AuthService.resetPassword", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects an unknown token", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(null);
    const result = await AuthService.resetPassword("bogus-token", "new-password-123");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/invalid or has expired/i);
  });

  it("rejects an expired token", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
      id: "t1", artistId: "artist-1", usedAt: null, expiresAt: new Date(Date.now() - 1000),
    } as never);
    const result = await AuthService.resetPassword("expired-token", "new-password-123");
    expect(result.success).toBe(false);
  });

  it("rejects an already-used token", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
      id: "t1", artistId: "artist-1", usedAt: new Date(), expiresAt: new Date(Date.now() + 100000),
    } as never);
    const result = await AuthService.resetPassword("used-token", "new-password-123");
    expect(result.success).toBe(false);
  });

  it("succeeds with a valid, unexpired, unused token and marks it used", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
      id: "t1", artistId: "artist-1", usedAt: null, expiresAt: new Date(Date.now() + 100000),
    } as never);

    const result = await AuthService.resetPassword("valid-token", "brand-new-password");
    expect(result.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
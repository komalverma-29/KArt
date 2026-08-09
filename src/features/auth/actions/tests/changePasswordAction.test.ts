/**
 * NOT EXECUTED HERE — same reason as categoryActions.test.ts (needs a real
 * next-auth install). Run in your actual project:
 *   npm test -- src/features/auth/actions/__tests__/changePasswordAction.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/authGuard", () => ({ requireArtistSession: vi.fn() }));
vi.mock("@/services/auth/AuthService", () => ({
  AuthService: { changePassword: vi.fn() },
}));

import { requireArtistSession } from "@/lib/authGuard";
import { AuthService } from "@/services/auth/AuthService";
import { changePasswordAction } from "@/features/auth/actions/changePasswordAction";

describe("changePasswordAction", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects an unauthenticated request without calling AuthService", async () => {
    vi.mocked(requireArtistSession).mockResolvedValue(null);

    const result = await changePasswordAction({
      currentPassword: "old", newPassword: "NewPass123", confirmNewPassword: "NewPass123",
    });

    expect(result).toEqual({ success: false, error: { message: "Unauthorized." } });
    expect(AuthService.changePassword).not.toHaveBeenCalled();
  });

  it("rejects a weak new password before reaching AuthService", async () => {
    vi.mocked(requireArtistSession).mockResolvedValue({ id: "artist-1", email: "a@b.com" });

    const result = await changePasswordAction({
      currentPassword: "old", newPassword: "weak", confirmNewPassword: "weak",
    });

    expect(result.success).toBe(false);
    expect(AuthService.changePassword).not.toHaveBeenCalled();
  });

  it("rejects mismatched confirmation before reaching AuthService", async () => {
    vi.mocked(requireArtistSession).mockResolvedValue({ id: "artist-1", email: "a@b.com" });

    const result = await changePasswordAction({
      currentPassword: "old", newPassword: "NewPass123", confirmNewPassword: "Different123",
    });

    expect(result.success).toBe(false);
    expect(AuthService.changePassword).not.toHaveBeenCalled();
  });

  it("returns success and never echoes any password back in the result", async () => {
    vi.mocked(requireArtistSession).mockResolvedValue({ id: "artist-1", email: "a@b.com" });
    vi.mocked(AuthService.changePassword).mockResolvedValue({ success: true });

    const result = await changePasswordAction({
      currentPassword: "old", newPassword: "NewPass123", confirmNewPassword: "NewPass123",
    });

    expect(result).toEqual({ success: true, data: null });
    expect(JSON.stringify(result)).not.toContain("NewPass123");
    expect(JSON.stringify(result)).not.toContain("old");
  });

  it("surfaces an incorrect-current-password failure without leaking hash/internal detail", async () => {
    vi.mocked(requireArtistSession).mockResolvedValue({ id: "artist-1", email: "a@b.com" });
    vi.mocked(AuthService.changePassword).mockResolvedValue({
      success: false, error: "Current password is incorrect.",
    });

    const result = await changePasswordAction({
      currentPassword: "wrong", newPassword: "NewPass123", confirmNewPassword: "NewPass123",
    });

    expect(result).toEqual({ success: false, error: { message: "Current password is incorrect." } });
  });
});
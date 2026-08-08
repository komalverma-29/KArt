import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { ArtistRepository } from "@/repositories/settings/ArtistRepository";
import { sendPasswordResetEmail } from "@/lib/email";

const PASSWORD_HASH_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 1000 * 60 * 30; // 30 minutes

function hashResetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * All authentication business logic lives here. This service never
 * returns a password hash under any circumstance, and every failure
 * path returns a generic result — callers must not be able to
 * distinguish "wrong password" from "account does not exist".
 */
export const AuthService = {
  async validateCredentials(
    email: string,
    password: string
  ): Promise<{ id: string; email: string; fullName: string } | null> {
    const artist = await ArtistRepository.findByEmail(email);
    if (!artist) {
      return null;
    }

    const isValid = await bcrypt.compare(password, artist.passwordHash);
    if (!isValid) {
      return null;
    }

    return { id: artist.id, email: artist.email, fullName: artist.fullName };
  },

  async changePassword(
    artistId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: true } | { success: false; error: string }> {
    const artist = await ArtistRepository.findById(artistId);
    if (!artist) {
      return { success: false, error: "Unable to update password." };
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, artist.passwordHash);
    if (!isCurrentValid) {
      return { success: false, error: "Current password is incorrect." };
    }

    const newHash = await bcrypt.hash(newPassword, PASSWORD_HASH_ROUNDS);
    await ArtistRepository.updatePasswordHash(artist.id, newHash);

    return { success: true };
  },

  /**
   * Always returns success regardless of whether the email exists,
   * per FR-AUTH-007 / non-enumeration requirement. Only sends an
   * email (and creates a token) when an account actually matches.
   */
  async requestPasswordReset(email: string): Promise<{ success: true }> {
    const artist = await ArtistRepository.findByEmail(email);

    if (artist) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashResetToken(rawToken);

      await prisma.passwordResetToken.create({
        data: {
          artistId: artist.id,
          tokenHash,
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      await sendPasswordResetEmail(artist.email, rawToken);
    }

    return { success: true };
  },

  async resetPassword(
    rawToken: string,
    newPassword: string
  ): Promise<{ success: true } | { success: false; error: string }> {
    const tokenHash = hashResetToken(rawToken);

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    const isInvalid =
      !record || record.usedAt !== null || record.expiresAt.getTime() < Date.now();

    if (isInvalid) {
      return { success: false, error: "This reset link is invalid or has expired." };
    }

    const newHash = await bcrypt.hash(newPassword, PASSWORD_HASH_ROUNDS);

    await prisma.$transaction([
      prisma.artist.update({
        where: { id: record.artistId },
        data: { passwordHash: newHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { success: true };
  },
};
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { hashSHA256, generateToken } from '../../utils/crypto.js';
import { logger } from '../../utils/logger.js';
import { AppError, UnauthorizedError, ConflictError } from '../../middleware/errorHandler.middleware.js';

const SALT_ROUNDS = 12;

export class AuthService {
  /**
   * Register a new user (admin-only operation)
   */
  async register(data: { email: string; name: string; password: string; role: string }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: data.role as any,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mfaEnabled: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      },
    });

    return user;
  }

  /**
   * Login with email/password, optionally verify MFA
   */
  async login(email: string, password: string, mfaCode?: string, ipAddress = 'unknown', userAgent = 'unknown') {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // MFA check
    if (user.mfaEnabled) {
      if (!mfaCode) {
        return { mfaRequired: true, userId: user.id };
      }

      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret!,
        encoding: 'base32',
        token: mfaCode,
        window: 1,
      });

      if (!verified) {
        throw new UnauthorizedError('Invalid MFA code');
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.role, user.email);

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: hashSHA256(tokens.refreshToken),
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        isActive: user.isActive,
        lastLogin: user.lastLogin?.toISOString() || null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string) {
    const tokenHash = hashSHA256(refreshToken);

    const session = await prisma.session.findFirst({
      where: {
        refreshTokenHash: tokenHash,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session || !session.user.isActive) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Rotate refresh token
    const newTokens = await this.generateTokens(session.user.id, session.user.role, session.user.email);

    // Update session with new refresh token
    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: hashSHA256(newTokens.refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return newTokens;
  }

  /**
   * Logout — invalidate session
   */
  async logout(refreshToken: string) {
    const tokenHash = hashSHA256(refreshToken);

    await prisma.session.deleteMany({
      where: { refreshTokenHash: tokenHash },
    });
  }

  /**
   * Setup MFA — generate secret + QR code
   */
  async setupMFA(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const secret = speakeasy.generateSecret({
      name: `${env.MFA_APP_NAME} (${user.email})`,
      length: 20,
    });

    // Store secret temporarily (confirmed when user verifies)
    await prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret.base32 },
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
    };
  }

  /**
   * Verify MFA code and enable MFA
   */
  async verifyMFA(userId: string, code: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) {
      throw new AppError('MFA not set up', 400);
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      throw new UnauthorizedError('Invalid MFA code');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    return { enabled: true };
  }

  /**
   * Get active sessions for a user
   */
  async getSessions(userId: string) {
    return prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string, userId: string) {
    await prisma.session.deleteMany({
      where: { id: sessionId, userId },
    });
  }

  // ─── Private helpers ───

  private async generateTokens(userId: string, role: string, email: string) {
    const accessToken = jwt.sign(
      { userId, role, email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY as any }
    );

    const refreshToken = generateToken(48);

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();

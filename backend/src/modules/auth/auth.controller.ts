import { Request, Response } from 'express';
import { authService } from './auth.service.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import { getClientIP } from '../../utils/helpers.js';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password, mfaCode } = req.body;
    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    const result = await authService.login(email, password, mfaCode, ipAddress, userAgent);

    if ('mfaRequired' in result && result.mfaRequired) {
      res.status(200).json({
        success: true,
        data: { mfaRequired: true },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token required',
      });
      return;
    }

    const tokens = await authService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      data: tokens,
    });
  }

  async logout(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  async setupMFA(req: AuthRequest, res: Response): Promise<void> {
    const result = await authService.setupMFA(req.userId!);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async verifyMFA(req: AuthRequest, res: Response): Promise<void> {
    const { code } = req.body;
    const result = await authService.verifyMFA(req.userId!, code);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async getSessions(req: AuthRequest, res: Response): Promise<void> {
    const sessions = await authService.getSessions(req.userId!);

    res.status(200).json({
      success: true,
      data: sessions,
    });
  }

  async revokeSession(req: AuthRequest, res: Response): Promise<void> {
    await authService.revokeSession(req.params.id, req.userId!);

    res.status(200).json({
      success: true,
      message: 'Session revoked',
    });
  }
}

export const authController = new AuthController();

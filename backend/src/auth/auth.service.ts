import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuditAction } from '@prisma/client';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import type { AppConfig } from '../config/configuration';
import type { LoginDto } from './dto/login.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { JwtPayload } from './strategies/jwt.strategy';
import { GUEST_USER_ID, currentWorkspace, isGuest } from '../common/workspace/workspace';

const BCRYPT_ROUNDS = 10;

type UserWithoutPassword = Omit<User, 'password'>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: UserWithoutPassword;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig>,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthTokens> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issue(user);
  }

  /** "Continue as guest": a session in the GUEST workspace, never the company's. */
  async guestLogin(): Promise<AuthTokens> {
    const user = await this.usersService.findById(GUEST_USER_ID);
    if (!user || !isGuest(user) || !user.isActive) {
      throw new UnauthorizedException('The guest demo is not available');
    }
    return this.issue(user);
  }

  private async issue(user: User): Promise<AuthTokens> {
    const tokens = this.generateTokens(user);

    await this.createAuditLog(AuditAction.LOGIN, user);

    const { password: _password, ...userWithoutPassword } = user;

    return {
      ...tokens,
      user: userWithoutPassword,
    };
  }

  async logout(user: User): Promise<void> {
    await this.createAuditLog(AuditAction.LOGOUT, user);
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    const user = await this.usersService.findById(userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    try {
      const refreshSecret =
        this.configService.get<string>('jwt.refreshSecret', { infer: true }) ?? '';

      await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessSecret =
      this.configService.get<string>('jwt.secret', { infer: true }) ?? '';

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: '7d',
    });

    return { accessToken };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email.toLowerCase().trim());

    // The guest account has no password; it only signs in through guestLogin().
    if (!user || !user.isActive || isGuest(user)) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    if (isGuest(user)) {
      throw new BadRequestException('The guest demo account has no password to change');
    }

    const currentValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!currentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const sameAsOld = await bcrypt.compare(dto.newPassword, user.password);
    if (sameAsOld) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    const hashed = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    await this.prisma.auditLog.create({
      data: {
        workspace: currentWorkspace(),
        action: AuditAction.UPDATE,
        entityType: 'User',
        entityId: userId,
        description: `User ${user.email} changed their password`,
        userId,
      },
    });

    return { message: 'Password changed successfully' };
  }

  async getProfile(userId: string): Promise<UserWithoutPassword> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { password: _password, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  private generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessSecret =
      this.configService.get<string>('jwt.secret', { infer: true }) ?? '';

    const refreshSecret =
      this.configService.get<string>('jwt.refreshSecret', { infer: true }) ?? '';

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: '7d',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: '30d',
    });

    return { accessToken, refreshToken };
  }

  // Sign-in happens before a session exists, so the workspace is named explicitly.
  private async createAuditLog(action: AuditAction, user: User): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action,
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        workspace: user.workspace,
      },
    });
  }
}

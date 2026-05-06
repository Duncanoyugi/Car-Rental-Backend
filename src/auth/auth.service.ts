import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from 'src/mail/mail.service';
import { CloudinaryService, UploadType } from 'src/utils/cloudinary.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { AuthResponse } from 'src/interfaces/auth.interface';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { RequestResetDto } from './dtos/request-reset.dto';
import { ConfirmResetDto } from './dtos/confirm-reset.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async register(dto: RegisterDto, file?: Express.Multer.File): Promise<AuthResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const emailVerifyToken = randomBytes(32).toString('hex');

    let profileImageUrl: string | undefined;

    if (file) {
      const uploadResult = await this.cloudinary.uploadFile(file, UploadType.USER_PROFILE, {
        entityType: 'user',
        entityId: 'temp_' + Date.now(),
      });
      profileImageUrl = uploadResult.secure_url;
    }

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        password: hashedPassword,
        phoneNumber: dto.phoneNumber,
        profileImage: profileImageUrl,
        role: 'CUSTOMER',
        emailVerifyToken,
        isEmailVerified: false,
      },
    });

    const verificationLink = `http://localhost:5173/verify-email?token=${emailVerifyToken}`;

    // Send verification email (non-blocking for development)
    this.mailService.sendMail({
      to: user.email,
      subject: 'Verify Your Email - Dante Car Rental',
      template: 'verify-email',
      context: {
        fullName: user.fullName,
        verificationLink,
      },
    }).catch((error) => {
      console.error('⚠️  Failed to send verification email:', error.message);
      // Continue with registration even if email fails
    });

    // ✅ Automatically log in (generate token)
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage ?? undefined,
        phoneNumber: user.phoneNumber ?? undefined,
      },
    };
  }

  async socialLogin(profile: {
    provider: string;
    providerId: string;
    email: string;
    fullName: string;
    picture?: string;
  }): Promise<AuthResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    let user = existingUser;

    if (user && !user.isEmailVerified) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true },
      });
    }

    if (!user) {
      const hashedPassword = await bcrypt.hash(randomBytes(32).toString('hex'), 10);

      user = await this.prisma.user.create({
        data: {
          fullName: profile.fullName,
          email: profile.email,
          password: hashedPassword,
          profileImage: profile.picture,
          role: 'CUSTOMER',
          isEmailVerified: true,
        },
      });
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage ?? undefined,
        phoneNumber: user.phoneNumber ?? undefined,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },

    });


    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');


    // Grace period for recently registered users (5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const isRecentlyRegistered = user.role === 'CUSTOMER' && user.createdAt > fiveMinutesAgo;

    if (user.role === 'CUSTOMER' && !user.isEmailVerified && !isRecentlyRegistered) {
      throw new UnauthorizedException('Please verify your email before logging in.');
    }


    if (user.mustChangePassword) {
      throw new UnauthorizedException('You must change your password before accessing the system.');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage ?? undefined,
        phoneNumber: user.phoneNumber ?? undefined,
      },
    };
  }

  async verifyEmail(token: string): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
      },
    });

    return '✅ Email verified successfully. You can now log in.';
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) throw new BadRequestException('Current password is incorrect');

    const newHashed = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: newHashed,
        mustChangePassword: false,
      },
    });

    // Send password changed notification (non-blocking)
    this.mailService.sendMail({
      to: user.email,
      subject: 'Password Changed Successfully',
      template: 'password-changed',
      context: {
        fullName: user.fullName,
        email: user.email,
      },
    }).catch((error) => {
      console.error('⚠️  Failed to send password changed email:', error.message);
    });

    return 'Password changed successfully';
  }

  async requestPasswordReset(dto: RequestResetDto): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || user.role === 'ADMIN') {
      throw new BadRequestException('Invalid or unauthorized user');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 1000 * 60 * 10); // 10 mins

    await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        resetToken: code,
        resetTokenExpiry: expiry,
      },
    });

    // Send reset code email (non-blocking)
    this.mailService.sendMail({
      to: dto.email,
      subject: 'Password Reset Code',
      template: 'reset-code',
      context: {
        fullName: user.fullName,
        code,
      },
    }).catch((error) => {
      console.error('⚠️  Failed to send reset code email:', error.message);
    });

    return '✅ Reset code sent to email';
  }

  async confirmPasswordReset(dto: ConfirmResetDto): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || user.role === 'ADMIN') throw new BadRequestException('Invalid or unauthorized user');
    if (!user.resetToken || !user.resetTokenExpiry) throw new BadRequestException('No reset request found');

    const now = new Date();
    if (user.resetToken !== dto.code || user.resetTokenExpiry < now) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const newHashed = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        password: newHashed,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Send password changed notification (non-blocking)
    this.mailService.sendMail({
      to: user.email,
      subject: 'Password Changed Successfully',
      template: 'password-changed',
      context: {
        fullName: user.fullName,
        email: user.email,
      },
    }).catch((error) => {
      console.error('⚠️  Failed to send password changed email:', error.message);
    });

    return '✅ Password updated successfully';
  }
}

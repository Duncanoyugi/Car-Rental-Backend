import { Body, Controller, Post, Query, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { AuthResponse } from 'src/interfaces/auth.interface';
import { LoginDto } from './dtos/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { RequestResetDto } from './dtos/request-reset.dto';
import { ConfirmResetDto } from './dtos/confirm-reset.dto';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { MulterFile } from 'src/interfaces/multer-file.interface';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @UseInterceptors(FileInterceptor('profileImage'))
  register(@UploadedFile() file: MulterFile, @Body() body: any) {
    return this.authService.register(body, file);
  }

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Initiates redirect to Google's OAuth consent screen
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res: Response): Promise<void> {
    const auth = await this.authService.socialLogin(req.user);
    const redirectUrl = new URL(this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173');
    redirectUrl.pathname = '/auth/callback';
    redirectUrl.searchParams.set('token', auth.access_token);
    redirectUrl.searchParams.set('user', Buffer.from(JSON.stringify(auth.user)).toString('base64'));
    res.redirect(redirectUrl.toString());
  }

  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  appleAuth() {
    // Initiates redirect to Apple's OAuth consent screen
  }

  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  async appleAuthRedirect(@Req() req, @Res() res: Response): Promise<void> {
    const auth = await this.authService.socialLogin(req.user);
    const redirectUrl = new URL(this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173');
    redirectUrl.pathname = '/auth/callback';
    redirectUrl.searchParams.set('token', auth.access_token);
    redirectUrl.searchParams.set('user', Buffer.from(JSON.stringify(auth.user)).toString('base64'));
    res.redirect(redirectUrl.toString());
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string): Promise<string> {
    return this.authService.verifyEmail(token);
  }
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req,
    @Body() dto: ChangePasswordDto,
  ): Promise<string> {
    return this.authService.changePassword(req.user.sub, dto);
  }
  @Post('request-reset')
  async requestReset(@Body() dto: RequestResetDto): Promise<string> {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('confirm-reset')
  async confirmReset(@Body() dto: ConfirmResetDto): Promise<string> {
    return this.authService.confirmPasswordReset(dto);
  }

}

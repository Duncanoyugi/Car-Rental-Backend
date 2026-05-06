import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('APPLE_CLIENT_ID') || '',
      teamID: configService.get<string>('APPLE_TEAM_ID') || '',
      keyID: configService.get<string>('APPLE_KEY_ID') || '',
      privateKey: configService.get<string>('APPLE_PRIVATE_KEY') || '',
      callbackURL: `${configService.get<string>('BACKEND_URL') || 'http://localhost:3000'}/auth/apple/callback`,
      scope: ['name', 'email'],
      passReqToCallback: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, user?: any, info?: any) => void,
  ) {
    const email = profile.email || profile._json?.email;
    const fullName = profile.name
      ? `${profile.name.firstName ?? ''} ${profile.name.lastName ?? ''}`.trim()
      : profile.displayName || 'Apple User';
    const picture = profile._json?.picture || undefined;

    if (!email) {
      return done(new Error('No email received from Apple'), false);
    }

    done(null, {
      provider: 'apple',
      providerId: profile.id,
      email,
      fullName,
      picture,
    });
  }
}

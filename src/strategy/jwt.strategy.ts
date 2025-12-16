import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AppConfig } from '../config';

export interface JwtPayload {
	sub: string;
	userId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(private configService: ConfigService<AppConfig>) {
		const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: jwtSecret,
		});
	}

	async validate(payload: JwtPayload) {
		return {
			userId: payload.userId || payload.sub,
		};
	}
}


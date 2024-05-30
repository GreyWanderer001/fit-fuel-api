import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as moment from 'moment';
import { Repository } from 'typeorm';
import { v4 } from 'uuid';

import { UserEntity } from '../../models/entities';
import { RefreshToken } from '../../models/entities';
import { UsersService } from '../users/users.service';

import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokensRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}
  async login(loginDto: LoginDto) {
    try {
      const user = await this.usersService.findOneByEmail(loginDto.email);

      await this.validatePassword(loginDto.password, user.password);

      const tokens = await this.generateTokens(user);
      return { ...tokens, user };
    } catch (NotFoundException) {
      throw new UnauthorizedException('Incorrect email or password.');
    }
  }

  async register(createUserDto: RegisterDto) {
    const user = await this.usersService.create(createUserDto);

    const tokens = await this.generateTokens(user);
    return { ...tokens, user };
  }

  async refresh(refreshToken: string) {
    const token = await this.refreshTokensRepository.findOne({
      where: { token: refreshToken },
    });

    if (!token) {
      throw new UnauthorizedException();
    }

    await this.refreshTokensRepository.delete({ token: refreshToken });

    if (token.expiresIn < new Date()) {
      throw new UnauthorizedException();
    }

    const user = await this.usersService.findOne(token.userId);

    return this.generateTokens(user);
  }

  async logout(token: string) {
    const deleteResult = await this.refreshTokensRepository.delete({ token });

    if (deleteResult.affected === 0) {
      throw new NotFoundException();
    }
  }

  private async generateRefreshToken(userId: string) {
    const today = moment();
    const expiresIn = moment(today)
      .add(this.configService.get('REFRESH_TOKEN_EXPIRES_IN_DAYS', 30), 'days')
      .toDate();

    const refreshToken: RefreshToken = await this.refreshTokensRepository.save({
      userId,
      token: v4(),
      expiresIn,
    });

    return refreshToken;
  }

  private async generateAccessToken(user: UserEntity) {
    const payload = { sub: user.id, roles: user.roles };

    const accessToken = await this.jwtService.signAsync(payload);

    return `Bearer ${accessToken}`;
  }

  private async generateTokens(user: UserEntity) {
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async validatePassword(
    enteredPassword: string,
    userPassword: string,
  ): Promise<void> {
    const isPasswordMatches = await bcrypt.compare(
      enteredPassword,
      userPassword,
    );

    if (!isPasswordMatches) {
      throw new UnauthorizedException('Incorrect email or password.');
    }
  }
}

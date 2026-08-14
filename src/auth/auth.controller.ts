import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService, AuthResult } from './auth.service';
import { LoginDto, RefreshTokenDto, RegisterDto } from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { UsersService, SafeUser } from '../users/users.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Create an account and receive tokens' })
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.authService.register(dto.email, dto.password, dto.displayName);
  }

  @Post('login')
  @ApiOperation({ summary: 'Exchange email + password for tokens' })
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate a refresh token into a fresh token pair' })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthResult> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Return the authenticated user' })
  async me(
    @CurrentUser() user: { userId: string; email: string; role: string },
  ): Promise<SafeUser | null> {
    const record = await this.usersService.findById(user.userId);
    return record ? this.usersService.toSafeUser(record) : null;
  }
}

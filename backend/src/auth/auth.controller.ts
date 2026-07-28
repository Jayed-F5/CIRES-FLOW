import { Body, Controller, Get, Post, Patch, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateStatutUserDto } from './dto/update-statut-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.authService.createUser(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout() {
    return { message: 'Déconnexion réussie' };
  }

  

  @UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Get('users')
getUsers() {
  return this.authService.getUsers();
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Patch('users/:id')
updateUser(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
  return this.authService.updateUser(id, dto);
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Patch('users/:id/statut')
updateStatutUser(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStatutUserDto) {
  return this.authService.updateStatutUser(id, dto.actif);
}

@UseGuards(JwtAuthGuard)
@Get('me')
getProfile(@Req() req: any) {
  return this.authService.getMe(req.user.userId);
}

@UseGuards(JwtAuthGuard)
@Patch('me/password')
changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
  return this.authService.changePassword(
    req.user.userId,
    dto.ancienMotDePasse,
    dto.nouveauMotDePasse,
  );
}
}
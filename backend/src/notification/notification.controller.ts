import { Controller, Get, Param, ParseIntPipe, Patch, Req, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findMine(@Req() req: any) {
    return this.notificationService.findMine(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  countUnread(@Req() req: any) {
    return this.notificationService.countUnread(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  markAsRead(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.notificationService.markAsRead(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('read-all')
  markAllAsRead(@Req() req: any) {
    return this.notificationService.markAllAsRead(req.user.userId);
  }
}
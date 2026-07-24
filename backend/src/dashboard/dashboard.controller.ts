import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Req() req: any) {
    return this.dashboardService.getStatsGlobales(req.user);
  }

  @Get('performance')
  async getPerformance(@Req() req: any) {
    return this.dashboardService.getPerformanceStats(req.user);
  }

  @Get('kpi')
  async getKpi(@Req() req: any) {
    return this.dashboardService.getKpiStats(req.user);
  }
}
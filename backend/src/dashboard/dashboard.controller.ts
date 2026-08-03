import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Req() req: any, @Query() filters: DashboardFilterDto) {
    return this.dashboardService.getStatsGlobales(req.user, filters);
  }

  @Get('performance')
  async getPerformance(@Req() req: any, @Query() filters: DashboardFilterDto) {
    return this.dashboardService.getPerformanceStats(req.user, filters);
  }

  @Get('kpi')
  async getKpi(@Req() req: any, @Query() filters: DashboardFilterDto) {
    return this.dashboardService.getKpiStats(req.user, filters);
  }
}
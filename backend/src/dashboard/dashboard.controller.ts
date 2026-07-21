import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { GetStatsQueryDto } from './dto/get-stats-query.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Query() query: GetStatsQueryDto) {
    const deptId = query.departementId ? parseInt(query.departementId, 10) : undefined;
    return this.dashboardService.getStatsGlobales(deptId);
  }

  @Get('performance')
  async getPerformance(@Query() query: GetStatsQueryDto) {
    const deptId = query.departementId ? parseInt(query.departementId, 10) : undefined;
    return this.dashboardService.getPerformanceStats(deptId);
  }
}
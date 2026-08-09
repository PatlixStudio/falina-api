import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

export interface AppInfo {
  service: string;
  version: string;
  docs: string;
}

@ApiTags('app')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Service information' })
  getInfo(): AppInfo {
    return { service: 'falina-api', version: '0.1.0', docs: '/api/docs' };
  }
}

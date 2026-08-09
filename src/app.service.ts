import { Injectable } from '@nestjs/common';
import { AppInfo } from './app.controller';

@Injectable()
export class AppService {
  getInfo(): AppInfo {
    return { service: 'falina-api', version: '0.1.0', docs: '/api/docs' };
  }
}

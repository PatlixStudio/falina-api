import { Test } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = moduleRef.get(AppService);
  });

  it('returns service metadata', () => {
    expect(service.getInfo()).toMatchObject({ service: 'falina-api' });
  });
});

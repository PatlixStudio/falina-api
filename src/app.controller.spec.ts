import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    controller = moduleRef.get(AppController);
  });

  it('exposes service metadata', () => {
    expect(controller.getInfo()).toMatchObject({
      service: 'falina-api',
      docs: '/api/docs',
    });
  });
});

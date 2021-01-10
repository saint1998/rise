import { Test, TestingModule } from '@nestjs/testing';
import { FinancialStatementsController } from './financial-statements.controller';

describe('FinancialStatementsController', () => {
  let controller: FinancialStatementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinancialStatementsController],
    }).compile();

    controller = module.get<FinancialStatementsController>(FinancialStatementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

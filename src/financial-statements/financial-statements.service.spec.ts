import { Test, TestingModule } from '@nestjs/testing';
import { FinancialStatementsService } from './financial-statements.service';

describe('FinancialStatementsService', () => {
  let service: FinancialStatementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FinancialStatementsService],
    }).compile();

    service = module.get<FinancialStatementsService>(FinancialStatementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Module } from '@nestjs/common';
import { FinancialStatementsService } from './financial-statements.service';
import { FinancialStatementsController } from './financial-statements.controller';

@Module({
  providers: [FinancialStatementsService],
  controllers: [FinancialStatementsController]
})
export class FinancialStatementsModule {}

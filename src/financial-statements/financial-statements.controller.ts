import { Controller, Get } from '@nestjs/common';
import { FinancialStatementsService } from './financial-statements.service';

@Controller('financial-statements')
export class FinancialStatementsController {
  constructor(private readonly appService: FinancialStatementsService) {}

  @Get()
  getAllStocks(): Array<string> {
    return this.appService.getAllStocks();
  }
}

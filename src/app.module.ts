import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FinancialStatementsModule } from './financial-statements/financial-statements.module';

@Module({
  imports: [FinancialStatementsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

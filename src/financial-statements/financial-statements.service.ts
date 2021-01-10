import { Injectable } from '@nestjs/common';

const cheerio = require('cheerio');
const request = require('request');

@Injectable()
export class FinancialStatementsService {
  getHelloFromFinance(): string {
    return 'Hello World From Finance!';
  }

  getStockName(): Array<string> {
    let res = [];
    return res;
  }

  getAllStocks(): Array<string> {
    const alphabet = [
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
      'H',
      'I',
      'J',
      'K',
      'L',
      'M',
      'N',
      'O',
      'P',
      'Q',
      'R',
      'S',
      'T',
      'U',
      'V',
      'W',
      'X',
      'Y',
      'Z',
      'NUMBER',
    ];
    let res = [];

    return res;
  }
}

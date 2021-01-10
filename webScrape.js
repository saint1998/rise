const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');

function timer(i) {
  setTimeout(function () {
    console.log(i);
  }, i);
}

function getStockWithPrefix(prefix) {
  return new Promise((resolve, reject) => {
    const data = [];
    request(
      `https://www.set.or.th/set/commonslookup.do?language=th&country=TH&prefix=${prefix}`,
      (error, response, html) => {
        if (!error && response.statusCode === 200) {
          const $ = cheerio.load(html);
          $(
            '#maincontent > div > div > div.table-responsive > table > tbody > tr > td > a',
          ).each((index, el) => {
            // console.log($(el).text());
            data.push($(el).text());
          });
          resolve(data);
        } else {
          reject(error);
        }
      },
    );
  });
}

function getAllStocks() {
  return new Promise((resolve, reject) => {
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
    const res = [];
    alphabet.forEach(async (el, i) => {
      let pro = new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(getStockWithPrefix(el));
        }, i * 1000);
      });
      res.push(pro);
    });
    Promise.all(res)
      .then((result) => {
        // console.log(result.length);
        let stocks = [];
        result.forEach((el) => (stocks = [...stocks, ...el]));
        resolve(stocks);
        // fs.writeFile('data.json', JSON.parse(stocks));
      })
      .catch((err) => console.log(err));
  });
}

async function main() {
  let result = await getAllStocks();
  console.log(result);
}

main();

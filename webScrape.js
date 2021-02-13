const request = require('request');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const StockModel = require('./models/stock');
const { check } = require('prettier');
const fs = require('fs');
const stock = require('./models/stock');
const reducer = (accumulator, currentValue) => accumulator + currentValue;

require('dotenv').config();

mongoose.connect(process.env.MONGO_DB, {
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
});

mongoose.connection.on('error', (err) => {
  console.log(err);
});

mongoose.connection.on('connected', () => {
  console.log('Connected');
});

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

async function addAllStockToDB() {
  let result = await getAllStocks();
  let createResult = [];
  result.forEach(async (stock) => {
    const newStock = new StockModel({ name: stock });
    try {
      createResult.push(newStock.save());
    } catch (error) {
      console.log(error);
    }
  });
  Promise.all(createResult)
    .then((result) => {
      result.forEach((el) => {
        console.log(el);
      });
    })
    .catch((err) => {
      console.log(err);
    });
}

function getIndex($) {
  $(
    'body > table > tbody > tr:nth-child(3) > td > table:nth-child(2) > tbody > tr:nth-child(1) > td > table > tbody > tr > td:nth-child(1) > table > tbody > tr:nth-child(2) > td',
  )
    .text()
    .trim()
    .split(' / ')
    .every((el) => {
      if (['SET50', 'SET100', 'mai'].includes(el)) {
        return el;
      }
    });
  return '-';
}

function getSector($) {
  let result = $(
    'body > table > tbody > tr:nth-child(3) > td > table:nth-child(2) > tbody > tr:nth-child(1) > td > table > tbody > tr > td:nth-child(1) > table > tbody > tr:nth-child(1) > td',
  )
    .text()
    .trim()
    .split('/');
  if (result.length > 1) {
    return result[1];
  } else {
    return result[0];
  }
}

function getCG($) {
  let result = $(
    'body > table > tbody > tr:nth-child(3) > td > table:nth-child(2) > tbody > tr:nth-child(1) > td > table > tbody > tr > td:nth-child(1) > table > tbody > tr:nth-child(3) > td > img',
  ).length;
  if (result > 0) {
    return result;
  } else {
    return '-';
  }
}

function getAuditor($) {
  return $('td strong:contains(Auditor)')
    .parent()
    .next()
    .find('tr:first-child td')
    .text()
    .split('/')[1];
}

function getFreeFloat($) {
  return $('td:contains(% /Shareholders)')
    .last()
    .next()
    .find('font:contains(%)')
    .first()
    .text();
}

function getLiabilities($) {
  return $('td:contains(Total Liabilities)')
    .last()
    .next()
    .text()
    .replace(/,/g, '');
}

function getEquity($) {
  return $("td:contains(Shareholders' Equity)")
    .last()
    .next()
    .text()
    .replace(/,/g, '');
}

function getAverageRevenue($) {
  let checkheader = [];
  $('strong:contains(Statement of Comprehensive Income (MB.))')
    .parent()
    .nextAll()
    .each((index, el) => {
      if ($(el).text().includes('M') && index != 0) {
        checkheader.push(0);
      } else {
        checkheader.push(1);
      }
    });
  if (checkheader.length < 1) {
    return 'No data';
  }
  if (checkheader.reduce(reducer) < 4) {
    return 'N/A';
  } else {
    let multiplier = { '3M': 4, '6M': 2, '9M': 4 / 3 };
    let multiply =
      multiplier[
        $('strong:contains(Statement of Comprehensive Income (MB.))')
          .parent()
          .next()
          .text()
          .slice(0, 2)
      ] || 1;
    let lastYear =
      parseFloat(
        $('td:contains(Total Revenues)').last().next().text().replace(/,/g, ''),
      ) * multiply;
    if (
      $('strong:contains(Statement of Comprehensive Income (MB.))')
        .parent()
        .nextAll()
        .eq(3)
        .text()
        .includes('M')
    ) {
      return 'error';
    }
    let firstYear = parseFloat(
      $('td:contains(Total Revenues)')
        .last()
        .nextAll()
        .eq(3)
        .text()
        .replace(/,/g, ''),
    );
    return (
      ((lastYear / firstYear) ** (1 / (checkheader.reduce(reducer) - 1)) - 1) *
      100
    ).toFixed(2);
  }
}

function getNPM($) {
  return $('td:contains(Net Profit Margin)').last().next().text();
}

function getAverageNPM($) {
  let checkheader = [];
  $('strong:contains(Ratios)')
    .parent()
    .nextAll()
    .each((index, el) => {
      if ($(el).text().includes('M') && index != 0) {
        checkheader.push(0);
      } else {
        checkheader.push(1);
      }
    });
  if (checkheader.length < 1) {
    return 'No data';
  }
  if (checkheader.reduce(reducer) < 3) {
    return 'N/A';
  } else {
    let result = 0;
    $('td:contains(Net Profit Margin)')
      .last()
      .nextAll()
      .each((index, el) => {
        if (checkheader[index]) {
          result += parseFloat($(el).text());
        }
      });
    return (result / checkheader.reduce(reducer)).toFixed(2);
  }
}

function getROE($) {
  return $('td:contains(ROE (%))').last().next().text();
}

function getDataFromStock(stock) {
  return new Promise((resolve, reject) => {
    console.log(
      `send request to:https://www.set.or.th/set/factsheet.do?symbol=${encodeURIComponent(
        stock,
      )}&ssoPageId=3&language=en&country=US`,
    );

    request(
      `https://www.set.or.th/set/factsheet.do?symbol=${encodeURIComponent(
        stock,
      )}&ssoPageId=3&language=en&country=US`,
      (error, response, html) => {
        if (!error && response.statusCode === 200) {
          const $ = cheerio.load(html);
          let data = {
            name: stock,
            index: getIndex($),
            sector: getSector($),
            screeningResult: false,
            liabilities: getLiabilities($),
            equity: getEquity($),
            dPerE: '',
            averageRevenue: getAverageRevenue($),
            NPM: getNPM($),
            averageNPM: getAverageNPM($),
            ROE: getROE($),
            CG: getCG($),
            auditor: getAuditor($),
            freeFloat: getFreeFloat($),
          };
          data.dPerE = (
            parseFloat(data.liabilities) / parseFloat(data.equity)
          ).toFixed(2);
          if (
            parseFloat(data.dPerE) < 1.5 &&
            parseFloat(data.averageRevenue) >= 8 &&
            parseFloat(data.NPM) >= 3 &&
            parseFloat(data.ROE) >= 15
          ) {
            data.screeningResult = true;
          }
          resolve(data);
        } else {
          reject(error);
        }
      },
    );
  });
}

function getAllDataFromStock() {
  return new Promise(async (resolve, reject) => {
    const stocks = await StockModel.find();
    const res = [];
    stocks.forEach(async (el, i) => {
      let pro = new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(getDataFromStock(el.name));
        }, i * 500);
      });
      res.push(pro);
    });
    Promise.all(res)
      .then((result) => {
        resolve(result);
      })
      .catch((err) => console.log(err));
  });
}

async function addDataToDB() {
  let result = await getAllDataFromStock();
  let createResult = [];
  result.forEach(async (data) => {
    try {
      createResult.push(
        StockModel.findOneAndUpdate({ name: data.name }, { ...data }),
      );
    } catch (error) {
      console.log(error);
    }
  });
  Promise.all(createResult)
    .then((result) => {
      result.forEach((el) => {
        console.log(el);
      });
    })
    .catch((err) => {
      console.log(err);
    });
}

//ในหน้ารวม บางอันไม่มีข้อมูล revenue
function getAverageRevenueFromStock(stock) {
  return new Promise((resolve, reject) => {
    console.log(
      `send request to https://www.set.or.th/set/companyhighlight.do?symbol=${encodeURIComponent(
        stock,
      )}&ssoPageId=5&language=en&country=US`,
    );
    const data = [];
    request(
      `https://www.set.or.th/set/companyhighlight.do?symbol=${encodeURIComponent(
        stock,
      )}&ssoPageId=5&language=en&country=US`,
      (error, response, html) => {
        if (!error && response.statusCode === 200) {
          const $ = cheerio.load(html);
          let checkheader = [];
          let lastIndex =
            $('th:contains(Period)')
              .nextAll()
              .slice(0, $('th:contains(Period)').nextAll().length - 1).length -
            1;
          $('th:contains(Period)')
            .nextAll()
            .slice(0, $('th:contains(Period)').nextAll().length - 1)
            .each((index, el) => {
              if ($(el).text().includes('Q') && index != lastIndex) {
                console.log('error');
              } else {
                checkheader.push(1);
              }
            });
          if (checkheader.length < 1) {
            resolve([stock, 'No data']);
          }
          if (checkheader.reduce(reducer) < 4) {
            resolve([stock, 'N/A']);
          } else {
            let multiplier = { Q1: 4, Q2: 2, Q3: 4 / 3 };
            let multiply =
              multiplier[
                $('th:contains(Period)')
                  .nextAll()
                  .slice(0, $('th:contains(Period)').nextAll().length - 1)
                  .last()
                  .text()
                  .slice(0, 2)
              ] || 1;
            let lastYear =
              parseFloat(
                $('td:contains(Revenue)')
                  .nextAll()
                  .eq(3)
                  .text()
                  .replace(/,/g, ''),
              ) * multiply;

            let firstYear = parseFloat(
              $('td:contains(Revenue)').next().text().replace(/,/g, ''),
            );
            resolve([
              stock,
              (
                ((lastYear / firstYear) **
                  (1 / (checkheader.reduce(reducer) - 1)) -
                  1) *
                100
              ).toFixed(2),
            ]);
          }
        } else {
          reject(response.statusCode);
        }
      },
    );
  });
}

function getAllAverageRevenue() {
  return new Promise(async (resolve, reject) => {
    const stocks = await StockModel.find({ averageRevenue: 'NaN' });
    const res = [];
    stocks.forEach(async (el, i) => {
      let pro = new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(getAverageRevenueFromStock(el.name));
        }, i * 1000);
      });
      res.push(pro);
    });
    Promise.all(res)
      .then((result) => {
        resolve(result);
      })
      .catch((err) => console.log(err));
  });
}

async function addAverageRevenueToDB() {
  let result = await getAllAverageRevenue();
  let createResult = [];
  result.forEach(async (data) => {
    try {
      createResult.push(
        StockModel.findOneAndUpdate(
          { name: data[0] },
          { averageRevenue: data[1] },
        ),
      );
    } catch (error) {
      console.log(error);
    }
  });
  Promise.all(createResult)
    .then((result) => {
      result.forEach((el) => {
        console.log(el);
      });
    })
    .catch((err) => {
      console.log(err);
    });
}

function isTrust(stock) {
  return new Promise((resolve, reject) => {
    console.log(
      `send request to https://www.set.or.th/set/companyhighlight.do?symbol=${encodeURIComponent(
        stock,
      )}&ssoPageId=5&language=en&country=US`,
    );
    request(
      `https://www.set.or.th/set/companyhighlight.do?symbol=${encodeURIComponent(
        stock,
      )}&ssoPageId=5&language=en&country=US`,
      (error, response, html) => {
        if (!error && response.statusCode === 200) {
          const $ = cheerio.load(html);
          resolve([
            stock,
            $(
              'span:contains(*Financial Data and Financial Ratio is not available for Trust and Fund securities.)',
            ).length,
          ]);
        } else {
          console.log(response.statusCode);
          reject(error);
        }
      },
    );
  });
}

function getAllIsTrust() {
  return new Promise(async (resolve, reject) => {
    const stocks = await StockModel.find();
    const res = [];
    stocks.forEach(async (el, i) => {
      let pro = new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(isTrust(el.name));
        }, i * 500);
      });
      res.push(pro);
    });
    Promise.all(res)
      .then((result) => {
        resolve(result);
      })
      .catch((err) => console.log(err));
  });
}

async function addIsTrustToDB() {
  let result = await getAllIsTrust();
  let createResult = [];
  result.forEach(async (data) => {
    try {
      createResult.push(
        StockModel.findOneAndUpdate({ name: data[0] }, { isTrust: data[1] }),
      );
    } catch (error) {
      console.log(error);
    }
  });
  Promise.all(createResult)
    .then((result) => {
      result.forEach((el) => {
        console.log(el);
      });
    })
    .catch((err) => {
      console.log(err);
    });
}

function screeningResult(stock) {
  return (
    (parseFloat(stock.dPerE) < 1.5 ||
      ['Banking', 'Finance & Securities', 'Insurance'].includes(
        stock.sector,
      )) &&
    parseFloat(stock.averageRevenue) >= 8 &&
    parseFloat(stock.NPM) >= 3 &&
    parseFloat(stock.ROE) >= 15
  );
}

async function updateScreeningResult() {
  const result = await StockModel.find();
  let createResult = [];
  result.forEach(async (data) => {
    try {
      if (screeningResult(data)) {
        createResult.push(
          StockModel.findOneAndUpdate(
            { name: data.name },
            { screeningResult: true },
          ),
        );
      }
    } catch (error) {
      console.log(error);
    }
  });
  Promise.all(createResult)
    .then((result) => {
      result.forEach((el) => {
        console.log(el);
      });
    })
    .catch((err) => {
      console.log(err);
    });
}

function getAverageROE(stock) {
  return new Promise((resolve, reject) => {
    console.log(
      `send request to https://www.set.or.th/set/companyhighlight.do?symbol=${encodeURIComponent(
        stock,
      )}&ssoPageId=5&language=en&country=US`,
    );
    const data = [];
    request(
      `https://www.set.or.th/set/companyhighlight.do?symbol=${encodeURIComponent(
        stock,
      )}&ssoPageId=5&language=en&country=US`,
      (error, response, html) => {
        if (!error && response.statusCode === 200) {
          const $ = cheerio.load(html);
          let checkheader = [];
          let lastIndex =
            $('th:contains(Period)')
              .nextAll()
              .slice(0, $('th:contains(Period)').nextAll().length - 1).length -
            1;
          $('th:contains(Period)')
            .nextAll()
            .slice(0, $('th:contains(Period)').nextAll().length - 2)
            .each((index, el) => {
              if ($(el).text().includes('Q') && index != lastIndex) {
                console.log('error');
              } else {
                checkheader.push(1);
              }
            });
          if (checkheader.length < 1) {
            return resolve([stock, 'No data']);
          }
          if (checkheader.reduce(reducer) < 2) {
            return resolve([stock, 'N/A']);
          } else {
            const ROE = [];
            checkheader.forEach((el, index) => {
              if (el) {
                ROE.push(
                  parseFloat(
                    $('td:contains(ROE)').nextAll().eq(index).text().trim(),
                  ),
                );
              }
            });
            let sum = ROE.reduce(reducer);
            return resolve([stock, (sum / ROE.length).toFixed(2)]);
          }
        } else {
          return reject(response.statusCode);
        }
      },
    );
  });
}
function getAllAverageROE() {
  return new Promise(async (resolve, reject) => {
    const stocks = await StockModel.find({ isTrust: false });
    const res = [];
    stocks.forEach(async (el, i) => {
      let pro = new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(getAverageROE(el.name));
        }, i * 500);
      });
      res.push(pro);
    });
    Promise.all(res)
      .then((result) => {
        resolve(result);
      })
      .catch((err) => console.log(err));
  });
}

async function addAverageROEToDB() {
  let result = await getAllAverageROE();
  let createResult = [];
  result.forEach(async (data) => {
    try {
      createResult.push(
        StockModel.findOneAndUpdate({ name: data[0] }, { averageROE: data[1] }),
      );
    } catch (error) {
      console.log(error);
    }
  });
  Promise.all(createResult)
    .then((result) => {
      result.forEach((el) => {
        console.log(el);
      });
    })
    .catch((err) => {
      console.log(err);
    });
}

function getAverageEPS(stock) {
  return new Promise((resolve, reject) => {
    console.log(
      `send request to https://www.set.or.th/set/companyhighlight.do?symbol=${encodeURIComponent(
        stock,
      )}&ssoPageId=5&language=en&country=US`,
    );
    const data = [];
    request(
      `https://www.set.or.th/set/companyhighlight.do?symbol=${encodeURIComponent(
        stock,
      )}&ssoPageId=5&language=en&country=US`,
      (error, response, html) => {
        if (!error && response.statusCode === 200) {
          const $ = cheerio.load(html);
          let checkheader = [];
          let lastIndex =
            $('th:contains(Period)')
              .nextAll()
              .slice(0, $('th:contains(Period)').nextAll().length - 1).length -
            1;
          $('th:contains(Period)')
            .nextAll()
            .slice(0, $('th:contains(Period)').nextAll().length - 2)
            .each((index, el) => {
              if ($(el).text().includes('Q') && index != lastIndex) {
                console.log('error');
              } else {
                checkheader.push(1);
              }
            });
          if (checkheader.length < 1) {
            return resolve([stock, 'No data']);
          }
          if (checkheader.reduce(reducer) < 2) {
            return resolve([stock, 'N/A']);
          } else {
            const EPS = [];
            checkheader.forEach((el, index) => {
              if (el) {
                EPS.push(
                  parseFloat(
                    $('td:contains(EPS (Baht))')
                      .nextAll()
                      .eq(index)
                      .text()
                      .trim(),
                  ),
                );
              }
            });
            let sum = EPS.reduce(reducer);
            return resolve([stock, (sum / EPS.length).toFixed(2)]);
          }
        } else {
          return reject(response.statusCode);
        }
      },
    );
  });
}
function getAllAverageEPS() {
  return new Promise(async (resolve, reject) => {
    const stocks = await StockModel.find({ isTrust: false });
    const res = [];
    stocks.forEach(async (el, i) => {
      let pro = new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(getAverageEPS(el.name));
        }, i * 500);
      });
      res.push(pro);
    });
    Promise.all(res)
      .then((result) => {
        resolve(result);
      })
      .catch((err) => console.log(err));
  });
}

async function addAverageEPSToDB() {
  let result = await getAllAverageEPS();
  let createResult = [];
  result.forEach(async (data) => {
    try {
      createResult.push(
        StockModel.findOneAndUpdate({ name: data[0] }, { averageEPS: data[1] }),
      );
    } catch (error) {
      console.log(error);
    }
  });
  Promise.all(createResult)
    .then((result) => {
      result.forEach((el) => {
        console.log(el);
      });
    })
    .catch((err) => {
      console.log(err);
    });
}

function getPrice(stock) {
  return new Promise((resolve, reject) => {
    console.log(
      `send request to https://marketdata.set.or.th/mkt/stockquotation.do?symbol=${encodeURIComponent(
        stock,
      )}&ssoPageId=1&language=en&country=US`,
    );
    const data = [];
    request(
      `https://marketdata.set.or.th/mkt/stockquotation.do?symbol=${encodeURIComponent(
        stock,
      )}&ssoPageId=1&language=en&country=US`,
      (error, response, html) => {
        if (!error && response.statusCode === 200) {
          const $ = cheerio.load(html);
          let price = $('tbody > tr > td:contains(Last)').next().text().trim();
          return resolve([stock, price]);
        } else {
          return reject(response.statusCode);
        }
      },
    );
  });
}
function getAllPrice() {
  return new Promise(async (resolve, reject) => {
    const stocks = await StockModel.find();
    const res = [];
    stocks.forEach(async (el, i) => {
      let pro = new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(getPrice(el.name));
        }, i * 500);
      });
      res.push(pro);
    });
    Promise.all(res)
      .then((result) => {
        resolve(result);
      })
      .catch((err) => console.log(err));
  });
}

async function addPriceToDB() {
  let result = await getAllPrice();
  let createResult = [];
  result.forEach(async (data) => {
    try {
      createResult.push(
        StockModel.findOneAndUpdate({ name: data[0] }, { price: data[1] }),
      );
    } catch (error) {
      console.log(error);
    }
  });
  Promise.all(createResult)
    .then((result) => {
      result.forEach((el) => {
        console.log(el);
      });
    })
    .catch((err) => {
      console.log(err);
    });
}

async function main() {
  // try {
  //   addPriceToDB().then(function (res) {
  //     console.log(res);
  //   });
  // } catch (e) {
  //   console.log(e);
  // }
  // const stocks = await StockModel.find();
  // let test = [];
  // stocks.forEach((el) => {
  //   if (
  //     el.averageROE != 'No data' &&
  //     el.averageROE != 'N/A' &&
  //     el.price != ''
  //   ) {
  //     if (
  //       parseFloat(el.averageROE) > 15 &&
  //       parseFloat(el.price) / parseFloat(el.averageEPS) < 25
  //     ) {
  //       el.pPerE = parseFloat(el.price) / parseFloat(el.averageEPS);
  //       test.push(el);
  //     }
  //   }
  // });
  let stocks = fs.readFileSync('./passScreening_ROE_PE_2020-01-20.json');
  stocks = JSON.parse(stocks);
  stocks.forEach((el) => {
    el.pPerE = el.pPerE.toFixed(2);
  });
  console.log(stocks.length);
  fs.writeFile(
    'passScreening_ROE_PE_2020-01-20.json',
    JSON.stringify(stocks),
    function (err) {
      if (err) throw err;
      console.log('Saved!');
    },
  );
}

main();

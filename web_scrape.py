from bs4 import BeautifulSoup as BS
from time import sleep
from termcolor import colored
from datetime import datetime
import urllib.parse
import re
import requests
import pandas as pd
import os
import sys
import logging

root = logging.getLogger()
root.setLevel(logging.DEBUG)

handler = logging.StreamHandler(sys.stdout)
handler.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
fh = logging.FileHandler('%s.log' % datetime.today().strftime('%d_%m_%Y_%H:%M'))
fh.setLevel(logging.DEBUG)
fh.setFormatter(formatter)
root.addHandler(fh)
root.addHandler(handler)
headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',}

def get_all_stock():
  prefixes = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','NUMBER']
  # prefixes=['A']
  stocks = []
  for prefix in prefixes:
    url = requests.get("https://www.set.or.th/set/commonslookup.do?language=en&country=US&prefix=%s"%prefix,headers=headers)
    status_code = colored(url.status_code,'green') if url.status_code == 200 else colored(url.status_code,'red')
    logging.info("send request to %s %s"%(url.url,status_code))
    if url.status_code == 200:
      soup = BS(url.content, "html.parser")
      rows = soup.find('table').findAll("tr")[1:]
      for row in rows:
        stock_name = row.find("a").get_text()
        stock = {"name":stock_name}
        stocks.append(stock)
  return stocks

#get auditor, CG, index, sector
def get_data_from_factsheet(stocks):
  for stock in stocks:
    url = requests.get("https://www.set.or.th/set/factsheet.do?symbol=%s&ssoPageId=3&language=en&country=US"%urllib.parse.quote(stock['name']),headers=headers)
    status_code = colored(url.status_code,'green') if url.status_code == 200 else colored(url.status_code,'red')
    logging.info("send request to %s %s"%(url.url,status_code))
    if url.status_code == 200:
      soup = BS(url.content, "html.parser")
      auditor = soup.find(lambda tag:tag.name=="strong" and "Auditor" in tag.text).parent.find_next_sibling().find("td").get_text().split("/")[1]
      CG = len(soup.findAll(lambda tag:tag.name=="td" and "CG Report" in tag.text)[-1].findAll('img'))
      index = soup.select_one('table > tr:nth-of-type(3) > td > table:nth-of-type(2) > tr:nth-of-type(1) > td > table > tr > td:nth-of-type(1) > table > tr:nth-of-type(2)').text.strip().split(" / ")
      sector_part = soup.select_one('table > tr:nth-of-type(3) > td > table:nth-of-type(2) > tr:nth-of-type(1) > td > table > tr > td:nth-of-type(1) > table > tr:nth-of-type(1)').text.strip().split("/")
      sector = sector_part[1] if len(sector_part) > 1 else sector_part[0]
      stock['auditor'] = auditor
      stock['CG'] = CG
      stock['index'] = index
      stock['sector'] = sector
  return stocks

def get_data_from_companyholder(stocks):
  for stock in stocks:
    url = requests.get("https://www.set.or.th/set/companyholder.do?symbol=%s&ssoPageId=6&language=en&country=US"%urllib.parse.quote(stock['name']),headers=headers)
    status_code = colored(url.status_code,'green') if url.status_code == 200 else colored(url.status_code,'red')
    logging.info("send request to %s %s"%(url.url,status_code))
    if url.status_code == 200:
      soup = BS(url.content, "html.parser")
      free_float_tag = soup.find(lambda tag:tag.name=="td" and "% Free float" in tag.text)
      free_float = free_float_tag.find_next_sibling().text if free_float_tag else "No Data"
      stock['free_float'] = free_float
  return stocks

def check_is_trust(stocks):
  for stock in stocks:
    url = requests.get("https://www.set.or.th/set/companyhighlight.do?symbol=%s&ssoPageId=5&language=en&country=US"%urllib.parse.quote(stock['name']),headers=headers)
    status_code = colored(url.status_code,'green') if url.status_code == 200 else colored(url.status_code,'red')
    logging.info("send request to %s %s"%(url.url,status_code))
    if url.status_code == 200:
      soup = BS(url.content, "html5lib")
      is_trust = bool(soup.find(lambda tag:tag.name=="span" and "Financial Data and Financial Ratio is not available for Trust and Fund securities" in tag.text))
      stock['is_trust'] = is_trust
  return stocks

def get_data_from_companyhighlight(stocks,year,quater=""):
  for stock in stocks:
    if stock['is_trust']:
      continue
    url = requests.get("https://www.set.or.th/set/companyhighlight.do?symbol=%s&ssoPageId=5&language=en&country=US"%urllib.parse.quote(stock['name']),headers=headers)
    status_code = colored(url.status_code,'green') if url.status_code == 200 else colored(url.status_code,'red')
    logging.info("send request to %s %s"%(url.url,status_code))
    if url.status_code == 200:
      soup = BS(url.content, "html5lib")
      is_trust = bool(soup.find(lambda tag:tag.name=="span" and "Financial Data and Financial Ratio is not available for Trust and Fund securities" in tag.text))
      if is_trust:
        continue
      tbody = soup.find_all('tbody')
      thead = soup.find_all('thead')
      df = pd.read_html('<table>'+str(thead[0])+ str(tbody[0]) +'</table>')
      df = df[0].set_index('Period as of')
      column = None
      for col in range(len(df.columns)):
        if year in df.columns[col]:
          column=col
          break
      if column == None:
        continue
      df_selected_year = df.iloc[:,column]
      stock['assets'] = df_selected_year['Assets']
      stock['liabilities'] = df_selected_year['Liabilities']
      stock['equity'] = df_selected_year['Equity']
      stock['paid_up_capital'] = df_selected_year['Paid-up Capital']
      stock['revenue'] = df_selected_year['Revenue']
      stock['net_profit'] = df_selected_year['Net Profit']
      stock['EPS'] = df_selected_year['EPS (Baht)']
      stock['ROA'] = df_selected_year['ROA(%)']
      stock['ROE'] = df_selected_year['ROE(%)']
      stock['NPM'] = df_selected_year['Net Profit Margin(%)']
      df = pd.DataFrame(stock,index=[0])
      dir_path = os.path.dirname(os.path.realpath(__file__))
      if not os.path.exists('./stocks/%s' % stock['name']):
        os.makedirs('./stocks/%s' % stock['name'])
      df.to_csv("./stocks/%s/%s.csv"%(stock['name'],year),index=False)
  return stocks
      
def get_basic_data_to_csv():
  stocks = get_all_stock()
  stocks = get_data_from_factsheet(stocks)
  stocks = get_data_from_companyholder(stocks)
  stocks = check_is_trust(stocks)
  df = pd.DataFrame(stocks)
  df.to_csv('./stocks/all_stocks_basic_data%s.csv'%datetime.today().strftime('%m_%Y'),index=False)

if len(sys.argv) < 2:
  print("Please specific comman\n\t- basic\n\t- financial")
elif sys.argv[1] == 'basic':
  get_basic_data_to_csv()
elif sys.argv[1] == 'financial':
  if not sys.argv[2] or len(sys.argv[2]) != 4:
    print('Please specific year in format xxxx')
  else:
    stocks = pd.read_csv('./stocks/all_stocks_basic_data02_2021.csv').to_dict('records')
    get_data_from_companyhighlight(stocks,sys.argv[2])




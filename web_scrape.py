from bs4 import BeautifulSoup as BS
from time import sleep
from termcolor import colored
import urllib.parse
import re
import requests

def get_all_stock():
  # prefixes = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','NUMBER']
  prefixes=['A']
  stocks = []
  for prefix in prefixes:
    url = requests.get("https://www.set.or.th/set/commonslookup.do?language=en&country=US&prefix=%s"%prefix)
    status_code = colored(url.status_code,'green') if url.status_code == 200 else colored(url.status_code,'red')
    print("send request to %s %s"%(url.url,status_code))
    if url.status_code == 200:
      soup = BS(url.content, "html.parser")
      rows = soup.find('table').findAll("tr")[1:]
      for row in rows:
        stock_name = row.find("a").get_text()
        stock = {"name":stock_name}
        stocks.append(stock)
      sleep(0.5)
  return stocks

#get auditor, CG, index, sector
def get_data_from_factsheet(stocks):
  for stock in stocks:
    url = requests.get("https://www.set.or.th/set/factsheet.do?symbol=%s&ssoPageId=3&language=en&country=US"%urllib.parse.quote(stock['name']))
    status_code = colored(url.status_code,'green') if url.status_code == 200 else colored(url.status_code,'red')
    print("send request to %s %s"%(url.url,status_code))
    if url.status_code == 200:
      soup = BS(url.content, "html.parser")
      auditor = soup.find(lambda tag:tag.name=="strong" and "Auditor" in tag.text).parent.find_next_sibling().find("td").get_text().split("/")[1]
      CG = len(soup.findAll(lambda tag:tag.name=="td" and "CG Report" in tag.text)[-1].findAll('img'))
      index = soup.select_one('table > tr:nth-of-type(3) > td > table:nth-of-type(2) > tr:nth-of-type(1) > td > table > tr > td:nth-of-type(1) > table > tr:nth-of-type(2)').text.strip().split(" / ")
      sector = soup.select_one('table > tr:nth-of-type(3) > td > table:nth-of-type(2) > tr:nth-of-type(1) > td > table > tr > td:nth-of-type(1) > table > tr:nth-of-type(1)').text.strip().split("/")[1]
      stock['auditor'] = auditor
      stock['CG'] = CG
      stock['index'] = index
      stock['sector'] = sector
  return stocks

def get_data_from_companyholder(stocks):
  for stock in stocks:
    url = requests.get("https://www.set.or.th/set/companyholder.do?symbol=%s&ssoPageId=6&language=en&country=US"%urllib.parse.quote(stock['name']))
    status_code = colored(url.status_code,'green') if url.status_code == 200 else colored(url.status_code,'red')
    print("send request to %s %s"%(url.url,status_code))
    if url.status_code == 200:
      soup = BS(url.content, "html.parser")
      free_float = soup.find(lambda tag:tag.name=="td" and "% Free float" in tag.text).find_next_sibling().text
      stocks['free_float'] = free_float

  return stocks


# stocks = get_all_stock()
# print(get_data_from_factsheet(stocks))
url = requests.get("https://www.set.or.th/set/companyholder.do?symbol=%s&ssoPageId=6&language=en&country=US"%'A')
status_code = colored(url.status_code,'green') if url.status_code == 200 else colored(url.status_code,'red')
print(status_code)
soup = BS(url.content, "html.parser")
print(soup.find(lambda tag:tag.name=="td" and "% Free float" in tag.text).find_next_sibling().text)
# print(url.content)
# print(soup.find('table').findAll("tr")[1].find("a").get_text())
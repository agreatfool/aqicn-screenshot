#!/usr/bin/env node
process.env['DEBUG'] = 'aqicn-screenshot';

import { Config } from './lib/config';
import * as LibOs from 'os';
import * as LibPath from 'path';
import * as puppeteer from 'puppeteer';
import * as dayjs from 'dayjs';
import * as debug from 'debug';

const logExec = debug('aqicn-screenshot');
const log = (msg: unknown) => {
  logExec(`${dayjs().format('YYYY-MM-DD HH:mm:ss SSS')} ${msg}`);
};

export const AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36';

const openBrowserPage = async (url: string): Promise<{ browser: puppeteer.Browser; page: puppeteer.Page }> => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--proxy-server=127.0.0.1:6152'],
  });
  const page = await browser.newPage();
  await Promise.all([
    page.setUserAgent(AGENT),
    page.setJavaScriptEnabled(true),
    page.setViewport({ width: 1920, height: 1080 }),
  ]);
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 3000 });
    // await page.goto(url, { waitUntil: 'networkidle2' });
  } catch (err) {
    // log('page.goto failed or timeout ...', err);
  }
  try {
    await page.waitForNavigation({ timeout: 5000, waitUntil: ['load', 'networkidle0'] });
    // await page.waitForNavigation({ waitUntil: ['load', 'networkidle0'] });
  } catch (err) {
    // log('page.waitForNavigation failed or timeout ...', err);
  }
  return { browser, page };
};

const screenshot = async (opened: { browser: puppeteer.Browser; page: puppeteer.Page }, output: string) => {
  const { browser, page } = opened;
  const evaluate = async (page: puppeteer.Page) => {
    page.on('console', async (msg) => {
      const msgArgs = msg.args();
      for (let i = 0; i < msgArgs.length; ++i) {
        log(await msgArgs[i].jsonValue());
      }
    });
    return page.evaluate(() => {
      console.log('page.evaluate: start to clean the page');
      const header = document.getElementById('header-in');
      if (header) {
        header.remove();
      }
      const fixedMenubar = document.getElementById('fixed-menubar');
      if (fixedMenubar) {
        fixedMenubar.remove();
      }
    });
  };
  await evaluate(page);
  await page.screenshot({ path: output });
  await browser.close();
};

(async function () {
  log('start ...');
  const home = LibOs.homedir();
  const output = LibPath.join(home, 'Downloads', dayjs().format('YYYY-MM-DD_HH-mm-ss.jpg'));
  log(`output: ${output}`);
  const opened = await openBrowserPage(Config.instance.data.aqicn);
  await screenshot(opened, output);
  log('done ...');
})().catch((err) => console.log(err));

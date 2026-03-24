import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`PAGE LOG [${msg.type()}]:`, msg.text());
  });

  page.on('pageerror', error => {
    console.error(`PAGE ERROR:`, error.message);
  });

  console.log('Navigating to http://127.0.0.1:5173...');
  try {
    await page.goto('http://127.0.0.1:5173/executive-dashboard/employees', { waitUntil: 'networkidle0', timeout: 30000 });
  } catch (err) {}

  await new Promise(resolve => setTimeout(resolve, 5000));
  await browser.close();
})();

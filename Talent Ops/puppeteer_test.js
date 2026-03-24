const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Capture page console logs
  page.on('console', msg => {
    console.log(`PAGE LOG [${msg.type()}]:`, msg.text());
  });

  page.on('pageerror', error => {
    console.error(`PAGE ERROR:`, error.message);
  });

  page.on('requestfailed', request => {
    console.warn(`PAGE REQUEST FAILED:`, request.url(), request.failure().errorText);
  });

  // Navigate to the target page
  console.log('Navigating to http://localhost:5173/executive-dashboard/employees');
  try {
    await page.goto('http://localhost:5173/executive-dashboard/employees', { waitUntil: 'networkidle0', timeout: 30000 });
  } catch (err) {
    console.log('Got timeout or error during goto, but waiting slightly longer to ensure error is captured.');
  }

  // Wait a moment for any asynchronous JS execution
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  await browser.close();
})();

const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  await page.goto('https://workday.wd5.myworkdayjobs.com/Workday/?source=Careers_Website', {
    waitUntil: 'domcontentloaded',
  });

  const allJobs = [];

  while (true) {
    try {
      // Wait for job links
      await page.waitForSelector('a[data-automation-id="jobTitle"]', { timeout: 20000 });

      // Extract title and link
      const jobs = await page.evaluate(() => {
        const jobElements = document.querySelectorAll('a[data-automation-id="jobTitle"]');
        return Array.from(jobElements).map(el => ({
          title: el.textContent.trim(),
          link: 'https://workday.wd5.myworkdayjobs.com' + el.getAttribute('href')
        }));
      });

      jobs.forEach(job => {
        if (!allJobs.find(j => j.link === job.link)) {
          allJobs.push(job);
        }
      });

      console.log(`✅ Scraped ${jobs.length} jobs, total: ${allJobs.length}`);

      // Check if Next button exists and is disabled
      const nextBtn = await page.$('button[data-uxi-element-id="next"]');

      if (!nextBtn) {
        console.log("❌ No next button found, ending.");
        break;
      }

      const isDisabled = await page.evaluate(btn => btn.disabled, nextBtn);

      if (isDisabled) {
        console.log("⏹️ Reached last page.");
        break;
      }

      // Scroll to next button and click
      await nextBtn.evaluate(btn => btn.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      await new Promise(resolve => setTimeout(resolve, 2000));
      await nextBtn.click();

      // Wait for new jobs to load
      await new Promise(resolve => setTimeout(resolve, 4000));


    } catch (err) {
      console.error('⚠️ Error scraping page:', err.message);
      break;
    }
  }

  // Save to JSON file
  fs.writeFileSync('jobs.json', JSON.stringify(allJobs, null, 2));
  console.log(`\n📁 Saved ${allJobs.length} jobs to jobs.json`);

  await browser.close();
})();

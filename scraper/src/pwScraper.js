const { chromium, Locator } = require('playwright');
const { expect } = require('@playwright/test');
/**
 * Needed additions: 
 *      -Scrolling down feature to fully load javascript elements
 *      -
 */
class BlackBoardScraper {
  constructor(netid = null, password = null) {
    this.netid = netid;
    this.password = password;
    this.page = null;
  }
  //Navigates to elearning login page and inputs user info to login
  async login() {
    process.stdout.write("Logging in\n");
    await this.page.goto("https://elearning.utdallas.edu/ultra/institution-page");
    await this.page.locator('#netid').fill(this.netid, { timeout: 10000 });
    await this.page.locator('#password').fill(this.password, { timeout: 10000 });
    await this.page.locator('#submit').click({ timeout: 10000 });
    //Checks if credentials are wrong


    try {
      // Wait for institution page
      await expect(this.page).toHaveTitle('Institution Page', { timeout: 10000 });
      console.log("Reached Institution page");
    } catch (error) {
      // If title check failed, now check for invalid login error
      const invalidLoginLocator = this.page.locator(
        '//*[contains(@class, "form-element errorMessage")]',
        { hasText: "Invalid username or password" }
      );

      if (await invalidLoginLocator.isVisible({ timeout: 500 })) {
        throw new Error("Login failed: Invalid username or password");
      }
      // If neither condition matched, rethrow the original error
      throw error;
    }
  }

  //After logging in, searches for Courses href to follow 
  async navigateToCourses() {
    process.stdout.write("Navigating to courses\n");
    await this.page.locator('//a[contains(@class, "base-navigation-button-content") and contains(@href, "/ultra/course")]').click({ timeout: 100000 });
    const terms = ["Current Courses", "Upcoming Courses", "2025 Spring - Regular","All Terms"];
    for (const term of terms) {
      try {
        //'//*[@id="courses-overview-filter-terms"]'
        const isExpanded = await this.page.locator('//*[@id="courses-overview-filter-terms"]').getAttribute('aria-expanded') === 'true';
        if (!isExpanded)
          await this.page.locator('//*[@id="courses-overview-filter-terms"]').click({ timeout: 10000 });
        console.log(`//li[contains(text(), "${term}")]`);
        await this.page.locator(`//li[contains(text(), "${term}")]`).click({ timeout: 1000 });
        const courseCards = await this.page.locator('div.element-details.summary').all({ timeout: 1500 });
        console.log(`Card length:${courseCards.length}`)
        if (courseCards && courseCards.length != 0) {
          console.log(`Card length:${courseCards.length}`)
          console.log(`Course Cards:${courseCards}`);
          return courseCards;

        }
      } catch (error) {
        if (error.name !== "TimeoutError")
          throw error;
        console.error(`Timeout Error`)
      };
    }


  }


  //Scrapes all data on Course Cards
  async scrapeCourses(courseCards) {
    process.stdout.write("Scraping courses\n");
    const result = [];
    if (!courseCards)
      throw Error("No CourseCards Found")
    //const courseCards = await this.page.locator('div.element-details.summary').all({ timeout: 10000 });
    process.stdout.write(`Found ${courseCards.length} course cards\n`);

    for (const card of courseCards) {
      await card.scrollIntoViewIfNeeded();
      const courseText = await card.locator('xpath=./*[starts-with(@id, "course-id-")]').innerText();
      const parent = card.locator('..');


      const professorElement = parent.locator('bdi[class*="baseText"]');
      let professorText = undefined;
      try {
        professorText = await professorElement.innerText({timeout:2000});
      } catch (error) {
        //console.error(`Professor text error:${error}`)
        if (error.name !== "TimeoutError")
          throw error;
        const view_all_button = await card.locator('//span[@class="combined-view-all-button"]').isVisible({ timeout: 1000 })
          .catch((error) => {
            if (error.name !== "TimeoutError")
              throw error;
            console.log(`Course with multiple instructors:${courseText}`)
          });

      }

      if(!professorText)
        continue;
      const courseParts = courseText.split('-');
      const professorParts = professorText.split(' ');
      const courseId = `${courseParts[2]}-${courseParts[3]}-${professorParts[professorParts.length - 1]}`;

      process.stdout.write(courseId);
      process.stdout.write("\n")
      result.push({ course_id: courseId });
    }

    return result;
  }

  async scrapeBlackboard() {
    process.stdout.write("Launching browser")
    const browser = await chromium.launch({
      //executablePath: "/opt/chrome/chrome",
      args: [
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote"       // Saves memory
      ],
      timeout: 30000
    });

    process.stdout.write("Browser launched\n");
    const page = await browser.newPage();
    this.page = page;

    try {
      await this.login();
      const courseCards = await this.navigateToCourses();
      const courses = await this.scrapeCourses(courseCards);
      return courses;
    } finally {
      await browser.close();
    }
  }
}


module.exports = { BlackBoardScraper }
/*
// Example usage
(async () => {
  const scraper = new BlackBoardScraper('netid', 'password');
  await scraper.scrapeBlackboard();
})();
*/
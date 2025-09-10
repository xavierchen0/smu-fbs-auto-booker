const { chromium } = require("playwright");
const { authenticateIfNeeded } = require("./authHelper");
const { performBooking } = require("./bookingHelper");
const logger = require("./logger");

async function main() {
  let hasError = false;
  let browser;

  try {
    const todayDate = new Date();
    logger.info(
      `============================================🚀 ${todayDate.toLocaleString("en-GB")} Start Booking Run ===========================================`,
    );

    // Launch browser
    // NOTE: Change to headless true when not debugging
    let headlessState = true;
    if (process.env.IS_BOOKING_DEBUG.toLowerCase() === "true") {
      headlessState = false;
    }

    logger.info({ headless: headlessState }, "Launching Playwright browser");

    browser = await chromium.launch({ headless: headlessState });

    // Check if we need to authenticate
    const authResult = await authenticateIfNeeded(browser);
    if (!authResult.success) {
      throw new Error("❌🔐 Authentication failed", {
        cause: authResult.message,
      });
    }
    logger.info({ authResult: authResult.message }, "Authentication completed");

    // Perform booking using authenticated state
    const bookingResult = await performBooking(browser);
    if (!bookingResult.success) {
      throw new Error("❌🏠 (Booking failed)", {
        cause: bookingResult.message,
      });
    }
    logger.info(
      { bookingResult: bookingResult.message },
      "Booking completed successfully",
    );

    logger.info("Booking automation run completed");
  } catch (error) {
    hasError = true;

    logger.error(
      {
        error: error.message,
        stack: error.stack,
        cause: error.cause,
      },
      "Booking automation run failed",
    );
  } finally {
    // clean-up; close browser
    if (browser) {
      await browser.close();
    }

    // return exit code on error; stop date increment
    if (hasError) {
      process.exit(1);
    }
  }
}

main();

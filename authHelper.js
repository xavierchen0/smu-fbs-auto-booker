const fs = require("fs");
const logger = require("./logger");
const authFile = process.env.STORAGESTATE_FP;

// Validate required environment variables
function validateEnvironment() {
  const required = [
    "STORAGESTATE_FP",
    "BOOKING_PAGE_URL",
    "MSFT_EMAIL",
    "MSFT_PWD",
  ];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

// Check if stored auth is still valid
async function isAuthValid(browser) {
  try {
    logger.info("Validating stored authentication state");

    validateEnvironment();

    if (!authFile || !fs.existsSync(authFile)) {
      logger.info("No authentication file found");

      return false;
    }

    logger.info({ authFile }, "Loading stored auth state");

    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();

    // Test if can access a protected page
    logger.info(
      { url: process.env.BOOKING_PAGE_URL },
      "Testing protected page access",
    );

    await page.goto(process.env.BOOKING_PAGE_URL, { timeout: 30_000 });

    // Check for login redirect
    const currentUrl = page.url();
    const isLoggedIn = !currentUrl.includes("login");

    logger.info({ currentUrl, isLoggedIn }, "Auth validation completed");

    await context.close();

    return isLoggedIn;
  } catch (error) {
    logger.warn(
      { error: error.message },
      "Auth validation failed, re-authentication required",
    );

    return false;
  }
}

// Perform new authentication
async function performAuthentication(browser) {
  logger.info("Starting authentication flow");
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to booking site login
    logger.info(
      { bookingPageUrl: process.env.BOOKING_PAGE_URL },
      "Navigating to booking site",
    );

    await page.goto(process.env.BOOKING_PAGE_URL);

    logger.info({ currentUrl: page.url() }, "Initial page loaded");

    // Perform Microsoft OAuth
    logger.info("Starting Microsoft OAuth flow");

    // Enter email
    logger.info({ selector: "#i0116" }, "Entering email address");

    await page.locator("#i0116").fill(process.env.MSFT_EMAIL);

    logger.info("Email address entered");

    // Click next
    logger.info({ selector: "#idSIButton9" }, "Clicking Next");

    await page.locator("#idSIButton9").click();

    logger.info("Next button clicked");

    // Wait until we reach SMU's login page
    logger.info("Waiting for login page redirect");

    await page.waitForURL(
      (url) =>
        url.toString().includes("login2.smu.edu.sg") ||
        url.toString().includes("login.microsoftonline.com"),
    );

    // WARN: might not necessarily work in all scenarios
    await page.waitForTimeout(5000);

    const currentUrl = page.url();

    logger.info({ currentUrl }, "Reached login page");

    if (currentUrl.includes("login.microsoftonline")) {
      logger.info("Detected Microsoft login page");

      await page
        .getByRole("link", { name: "Use your password instead" })
        .click();

      await page.waitForURL("**/login2.smu.edu.sg/**");
    }

    logger.info({ currentUrl: page.url() }, "On SMU login page");

    // Enter password
    logger.info({ selector: "#passwordInput" }, "Entering password");

    await page.locator("#passwordInput").fill(process.env.MSFT_PWD);

    logger.info("Password entered");

    // Click submit button
    logger.info({ selector: "#submitButton" }, "Submitting login");

    await page.locator("#submitButton").click();

    logger.info("Login form submitted");

    // NOTE: adapted waitForURL
    // Wait for successful redirect to SMU's FBS homepage
    const expectedUrl = process.env.BOOKING_PAGE_URL + "/home";

    logger.info({ expectedUrl }, "Waiting for final auth redirect to home");

    await page.waitForURL(expectedUrl, { timeout: 15000, waitUntil: "commit" });

    logger.info({ finalUrl: page.url() }, "Authentication successful");

    // Save authentication state
    logger.info({ authFile }, "Saving auth state");

    await context.storageState({ path: authFile });

    logger.info("Auth state saved");

    logger.info("Closing auth context");

    await context.close();

    logger.info("Authentication completed");

    return { success: true, message: "🔐 New authentication completed" };
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        currentUrl: page.url(),
        step: "authentication_flow",
      },
      "Authentication failed",
    );

    logger.info("Closing auth context after error");
    await context.close();

    return { success: false, message: error.stack };
  }
}

// Main authentication function
async function authenticateIfNeeded(browser) {
  logger.info("Checking authentication requirement");

  // Check if existing auth is valid
  if (await isAuthValid(browser)) {
    logger.info("Using existing authentication");

    return { success: true, message: "🔐 Use existing valid authentication" };
  }

  // Authentication expired or missing, perform new auth
  logger.info("Authentication required, starting new flow");

  return await performAuthentication(browser);
}

module.exports = { authenticateIfNeeded };

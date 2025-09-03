const logger = require("./logger");

const monthIndexMap = new Map([
  [0, "january"],
  [1, "february"],
  [2, "march"],
  [3, "april"],
  [4, "may"],
  [5, "june"],
  [6, "july"],
  [7, "august"],
  [8, "september"],
  [9, "october"],
  [10, "november"],
  [11, "december"],
]);

// Validate required environment variables
function validateEnvironment() {
  const required = ["BOOKING_DATE", "BOOKING_TIME_START", "BOOKING_TIME_END"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

function checkValidBookingDate(bookingDate) {
  // Validity == date parseable by Date.parse() &&
  //             within 2 weeks after today's date

  // Use date-only comparison to avoid timezone/time issues
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Reset to midnight

  const bookingDateOnly = new Date(bookingDate);
  bookingDateOnly.setHours(0, 0, 0, 0); // Reset to midnight

  logger.debug(
    { currentDate, bookingDate: bookingDateOnly },
    "Validating booking date",
  );

  // Check if booking date is parseable by Date.parse()
  if (isNaN(bookingDateOnly.valueOf())) {
    logger.info("Invalid booking date format");
    return { isValid: false, message: "Wrong booking date format" };
  }

  // Check if booking date is within 2 weeks after today's date
  const timeDiff = bookingDateOnly.getTime() - currentDate.getTime();
  const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

  logger.info({ dayDiff }, "Date difference calculated");

  //   Check if negative dayDiff
  //     Must be ahead of today's date
  if (dayDiff < 0) {
    logger.info({ dayDiff }, "Booking date is in the past");

    return {
      isValid: false,
      message: "Booking date cannot be before today's date",
    };
  }

  if (dayDiff > 14) {
    logger.info({ dayDiff }, "Booking date exceeds 14-day limit");
    return {
      isValid: false,
      message: "Booking date must be within 14 days of today's date",
    };
  }

  logger.info({ dayDiff }, "Booking date is valid");

  return { isValid: true, message: "Booking date is valid" };
}

function checkValidBookingTime(bookingStartTime, bookingEndTime) {
  logger.info({ bookingStartTime, bookingEndTime }, "Validating booking times");

  // Validate start time format (08:30 to 22:00)
  const startTimeRegex = /^(08:30|0[9]:(00|30)|1[0-9]:(00|30)|2[0-2]:(00|30))$/;
  if (!startTimeRegex.test(bookingStartTime)) {
    logger.info({ bookingStartTime }, "Invalid start time format");

    return {
      isValid: false,
      message:
        "Start time must be between 08:30 and 22:00 in 30-minute intervals",
    };
  }

  // Validate end time format (09:00 to 22:30)
  const endTimeRegex = /^(0[9]:(00|30)|1[0-9]:(00|30)|2[0-2]:(00|30))$/;
  if (!endTimeRegex.test(bookingEndTime)) {
    logger.info({ bookingEndTime }, "Invalid end time format");

    return {
      isValid: false,
      message:
        "End time must be between 09:00 and 22:30 in 30-minute intervals",
    };
  }

  // Parse times for comparison
  const [startHours, startMinutes] = bookingStartTime.split(":").map(Number);
  const [endHours, endMinutes] = bookingEndTime.split(":").map(Number);

  const startTimeInMinutes = startHours * 60 + startMinutes;
  const endTimeInMinutes = endHours * 60 + endMinutes;

  logger.info(
    { startTimeInMinutes, endTimeInMinutes },
    "Parsed time components",
  );

  // Check if start time is before end time
  if (startTimeInMinutes >= endTimeInMinutes) {
    logger.info(
      { startTimeInMinutes, endTimeInMinutes },
      "Start time must be before end time",
    );

    return {
      isValid: false,
      message: "Booking start time must be before end time",
    };
  }

  // Check if booking duration is within 4 hours
  const durationInHours = (endTimeInMinutes - startTimeInMinutes) / 60;

  if (durationInHours > 4) {
    logger.info({ durationInHours }, "Booking duration exceeds 4-hour limit");

    return {
      isValid: false,
      message: "Booking duration cannot exceed 4 hours",
    };
  }

  logger.info(
    { startTime: bookingStartTime, endTime: bookingEndTime },
    "Booking times are valid",
  );
  return { isValid: true, message: "Booking times are valid" };
}

// Perform room booking with validation
async function performBooking(browser) {
  const context = await browser.newContext({
    storageState: process.env.STORAGESTATE_FP,
  });
  const page = await context.newPage();

  try {
    // Check if BOOKING_DATE, BOOKING_TIME_START, BOOKING_TIME_END
    //   required env var is availabe
    validateEnvironment();

    // Check valid booking date
    logger.info({ bookingDate: bookingDate }, "Parsing booking date");

    const bookingDate = new Date(process.env.BOOKING_DATE);

    logger.info({ parsedBookingDate: bookingDate }, "Running date validation");

    const isBookingDateValidResult = checkValidBookingDate(bookingDate);

    if (!isBookingDateValidResult.isValid) {
      logger.error(
        { validationMessage: isBookingDateValidResult.message },
        "Date validation failed",
      );

      throw new Error(isBookingDateValidResult.message);
    }

    logger.info(
      { validationMessage: isBookingDateValidResult.message },
      "Date validation passed",
    );

    // Check valid booking times
    logger.info(
      {
        bookingTimeStart: process.env.BOOKING_TIME_START,
        bookingTimeEnd: process.env.BOOKING_TIME_END,
      },
      "Parsing booking times",
    );

    const bookingTimeStart = process.env.BOOKING_TIME_START;
    const bookingTimeEnd = process.env.BOOKING_TIME_END;

    logger.info(
      { bookingTimeStart: bookingTimeStart, bookingTimeEnd: bookingTimeEnd },
      "Running time validation",
    );

    const isBookingTimeValidResult = checkValidBookingTime(
      bookingTimeStart,
      bookingTimeEnd,
    );

    if (!isBookingTimeValidResult.isValid) {
      logger.error(
        { validationMessage: isBookingTimeValidResult.message },
        "Time validation failed",
      );

      throw new Error(isBookingTimeValidResult.message);
    }

    logger.info(
      { validationMessage: isBookingTimeValidResult.message },
      "Time validation passed",
    );

    // Navigate to booking page
    logger.info(
      { url: process.env.BOOKING_PAGE_URL },
      "Navigating to booking page",
    );

    await page.goto(process.env.BOOKING_PAGE_URL);

    // Click on the readonly date input to trigger date picker
    logger.info("Opening date picker");

    await page
      .locator('iframe[id="frameBottom"]')
      .contentFrame()
      .locator('iframe[id="frameContent"]')
      .contentFrame()
      .locator("#DateBookingFrom_c1_textDate")
      .click();

    logger.info("Date picker opened");

    // Convert to Date object for today's date in Singapore timezone
    const todaysDate = new Date();
    const singaporeTodaysDate = new Date(
      todaysDate.toLocaleString("en-US", { timeZone: "Asia/Singapore" }),
    );

    logger.info(
      { singaporeTodaysDate: singaporeTodaysDate, bookingDate: bookingDate },
      "Checking calendar navigation needs",
    );

    // SMU only allows booking of rooms 2 weeks in advance
    //   Check if we need to click next to select the date we want
    //   This is usually the case when the date we want is in the
    //   following month of today's month
    const monthDiff = bookingDate.getMonth() - singaporeTodaysDate.getMonth();

    logger.info({ monthDiff }, "Calendar month difference calculated");

    if (monthDiff === 1) {
      logger.info("Navigating to next month in calendar");

      await page
        .locator('iframe[id="frameBottom"]')
        .contentFrame()
        .locator('iframe[id="frameContent"]')
        .contentFrame()
        .locator('[id="__calendar_nextArrow"]')
        .click();
    }

    // Click and select the booking date in booking picker
    const bookingDateDDMthYYYY =
      bookingDate.getDate().toString().padStart(2, "0") +
      "-" +
      monthIndexMap.get(bookingDate.getMonth()).substring(0, 3) +
      "-" +
      bookingDate.getFullYear().toString();

    logger.info(
      { formattedDate: bookingDateDDMthYYYY },
      "Selecting date in calendar",
    );

    await page
      .locator('iframe[id="frameBottom"]')
      .contentFrame()
      .locator('iframe[id="frameContent"]')
      .contentFrame()
      .getByTitle(bookingDateDDMthYYYY)
      .click();

    // Enter user chosen facility into search to narrow down
    logger.info(
      { facility: process.env.BOOKING_FACILITY },
      "Searching for facility",
    );

    await page
      .locator('iframe[id="frameBottom"]')
      .contentFrame()
      .locator('iframe[id="frameContent"]')
      .contentFrame()
      .locator("#panel_SimpleSearch")
      .getByRole("textbox")
      .fill(process.env.BOOKING_FACILITY);

    // Click search icon
    await page
      .locator('iframe[id="frameBottom"]')
      .contentFrame()
      .locator('iframe[id="frameContent"]')
      .contentFrame()
      .locator("#panel_buttonSimpleSearch")
      .click();

    // Wait for data to load and element to appear
    await page
      .locator('iframe[id="frameBottom"]')
      .contentFrame()
      .locator('iframe[id="frameContent"]')
      .contentFrame()
      .getByRole("link", { name: process.env.BOOKING_FACILITY })
      .waitFor({ state: "attached" });

    logger.info(
      { facility: process.env.BOOKING_FACILITY },
      "Search for availability",
    );

    // Click search for availability
    await page
      .locator('iframe[id="frameBottom"]')
      .contentFrame()
      .locator('iframe[id="frameContent"]')
      .contentFrame()
      .getByRole("link", { name: "Search Availability" })
      .click();

    logger.info("Clicking on a random timeslot to go into booking page");

    // Click on the div for time 08:30 so that we can go to the booking page
    await page
      .locator('iframe[id="frameBottom"]')
      .contentFrame()
      .locator('iframe[id="frameContent"]')
      .contentFrame()
      .locator(".scheduler_bluewhite_cell")
      .nth(35)
      .click({ force: true });

    // Wait for the time cell to be highlighted
    await page
      .locator('iframe[id="frameBottom"]')
      .contentFrame()
      .locator('iframe[id="frameContent"]')
      .contentFrame()
      .locator('.scheduler_bluewhite_event[title*="selected"]')
      .waitFor();

    logger.info("Click 'Make Booking' button");
    // Click make booking button to go to booking page
    await page
      .locator('iframe[id="frameBottom"]')
      .contentFrame()
      .locator('iframe[id="frameContent"]')
      .contentFrame()
      .getByRole("link", { name: "Make Booking" })
      .click();

    // Select booking start time
    logger.info("Processing booking start time");
    const [startHour, startMinute] = bookingTimeStart.split(":").map(Number);
    const bookingStartDateTime = new Date(bookingDate);

    bookingStartDateTime.setHours(startHour, startMinute, 0, 0);

    const optionBookingStartDateTime = bookingStartDateTime
      .toLocaleString("en-US")
      .replaceAll(",", "");

    logger.info(
      { startTime: optionBookingStartDateTime },
      "Setting booking start time",
    );

    await page
      .locator('iframe[id="frameBottom"]')
      .contentFrame()
      .locator('iframe[id="frameContent"]')
      .contentFrame()
      .locator('iframe[id="frameBookingDetails"]')
      .contentFrame()
      .locator("#bookingFormControl1_DropDownStartTime_c1")
      .selectOption(optionBookingStartDateTime);

    // Select booking end time
    logger.info("Processing booking end time");

    const [endHour, endMinute] = bookingTimeEnd.split(":").map(Number);
    const bookingEndDateTime = new Date(bookingDate);

    bookingEndDateTime.setHours(endHour, endMinute, 0, 0);

    const optionBookingEndDateTime = bookingEndDateTime
      .toLocaleString("en-US")
      .replaceAll(",", "");

    logger.info(
      { endTime: optionBookingEndDateTime },
      "Setting booking end time",
    );

    await page
      .locator('iframe[id="frameBottom"]')
      .contentFrame()
      .locator('iframe[id="frameContent"]')
      .contentFrame()
      .locator('iframe[id="frameBookingDetails"]')
      .contentFrame()
      .locator("#bookingFormControl1_DropDownEndTime_c1")
      .selectOption(optionBookingEndDateTime);

    // Input the purpose field
    //   Delay is required because while the form is loading, any fields with inputs will be refreshed
    //   WARN: If network is slow, this might exceed 10s, I might need to re-evaluate a more robust way to wait
    await page.waitForTimeout(10000);

    logger.info(
      { bookingPurpose: process.env.BOOKING_PURPOSE },
      "Setting booking purpose after intentional delay",
    );

    await page
      .locator('iframe[id="frameBottom"]')
      .contentFrame()
      .locator('iframe[id="frameContent"]')
      .contentFrame()
      .locator('iframe[id="frameBookingDetails"]')
      .contentFrame()
      .locator("#bookingFormControl1_TextboxPurpose_c1")
      .fill(process.env.BOOKING_PURPOSE);

    // Add co-booker
    //   Click button to add co-booker

    logger.info({ coBooker: process.env.BOOKING_COBOOKER }, "Add co-booker");

    await page
      .locator('iframe[id="frameBottom"]')
      .contentFrame()
      .locator('iframe[id="frameContent"]')
      .contentFrame()
      .locator('iframe[id="frameBookingDetails"]')
      .contentFrame()
      .getByRole("link", { name: "Add" })
      .click();

    //   Wait for the search window to appear
    await page
      .locator('iframe[name="frameBottom"]')
      .contentFrame()
      .locator('iframe[name="frameContent"]')
      .contentFrame()
      .locator('iframe[name="frameBookingDetails"]')
      .contentFrame()
      .getByRole("cell", { name: "Keywords" })
      .getByRole("textbox")
      .waitFor({ state: "visible" });

    //   Input co-booker email into the textbox
    await page
      .locator('iframe[name="frameBottom"]')
      .contentFrame()
      .locator('iframe[name="frameContent"]')
      .contentFrame()
      .locator('iframe[name="frameBookingDetails"]')
      .contentFrame()
      .getByRole("cell", { name: "Keywords" })
      .getByRole("textbox")
      .fill(process.env.BOOKING_COBOOKER);

    //   Click the search for co-booker button
    await page
      .locator('iframe[name="frameBottom"]')
      .contentFrame()
      .locator('iframe[name="frameContent"]')
      .contentFrame()
      .locator('iframe[name="frameBookingDetails"]')
      .contentFrame()
      .getByRole("link", { name: "Search" })
      .click();

    //   Wait for the co-booker to appear
    await page
      .locator('iframe[name="frameBottom"]')
      .contentFrame()
      .locator('iframe[name="frameContent"]')
      .contentFrame()
      .locator('iframe[name="frameBookingDetails"]')
      .contentFrame()
      .getByRole("link", { name: process.env.BOOKING_COBOOKER })
      .waitFor({ state: "attached" });

    //   Select the co-booker
    await page
      .locator('iframe[name="frameBottom"]')
      .contentFrame()
      .locator('iframe[name="frameContent"]')
      .contentFrame()
      .locator('iframe[name="frameBookingDetails"]')
      .contentFrame()
      .getByRole("link", { name: process.env.BOOKING_COBOOKER })
      .click();

    logger.info("Accept acknowledgement");

    // Accept acknowledgement
    await page
      .locator('iframe[name="frameBottom"]')
      .contentFrame()
      .locator('iframe[name="frameContent"]')
      .contentFrame()
      .locator('iframe[name="frameBookingDetails"]')
      .contentFrame()
      .locator("#bookingFormControl1_TermsAndConditionsCheckbox_c1")
      .click();

    // Click confirm
    if (process.env.IS_BOOKING_DEBUG.toLowerCase() === "false") {
      logger.info("Confirming booking submission");

      await page
        .locator('iframe[name="frameBottom"]')
        .contentFrame()
        .locator('iframe[name="frameContent"]')
        .contentFrame()
        .locator('iframe[name="frameBookingDetails"]')
        .contentFrame()
        .getByRole("link", { name: "Confirm" })
        .click();
    } else {
      logger.info("Booking confirmation skipped (debug mode)");
    }

    // Delay before clicking confirm to allow time for page to confirm
    await page.waitForTimeout(10000);

    return { success: true, message: "Booking process completed" };
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        bookingDate: process.env.BOOKING_DATE,
      },
      "Booking process failed",
    );

    return { success: false, message: error.stack };
  }
}

module.exports = { performBooking };

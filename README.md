# Introduction
Do you have your favourite SMU room that you always study or do project meetings in? Isn't it frustrating when your favourite room is booked because you were not fast enough 😭?

This tool serves to automate the booking process entirely with your configuration specified in a `.env` file 🚀!

# Tech Stack
This tool is built entirely with the following Tech Stack:

[![Tech Stack](https://skillicons.dev/icons?i=js,nodejs,bash)](https://skillicons.dev)
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/playwright/playwright-original.svg" width="50" height="50" style="background-color: rgb(36, 41, 56); display: inline-block; padding: 8px; border-radius: 4px;"/>

- Javascript
- NodeJS
- Playwright
- Bash
- Cron jobs

# Installation
1. Ensure you have NodeJS installed [link to installation guide](https://nodejs.org/en/download/)
2. Clone the repo to local
3. cd to root directory
4. run `npm install`

# Usage
To run the script, just run at the root directory

```bash
node --env-file=.env main.js
```

# How does it work?
1. The tool launches a profileless browser and logs you in via SMU login page
    - The FBS site would either redirect you to log in directly via SMU login page, or redirect you to an intermediate page asking you to open your Microsoft Authenticator app and enter the code displayed on the web page in the app itself.
    - If you are redirected to the latter, this tool will automatically select the option to log you in via SMU login page.
    - Support for Microsoft's Time-based One-Time Password (TOTP) is not supported yet, but if there is demand for it, I can implement it using the npm package `otpauth` and with some simple Microsoft Authenticator setup.
2. After login, the tool saves your login state in a local file stored in the directory `./playwright/.auth/user.json`.
    - This file is git ignored to protect my own user data.
3. The tool will then launch a new browser to start the auto booking process.
    - Note that if you have logged in before and you have the local login state file, and that login has not expired, Steps 1 and 2 will be automatically skipped.
4. That's it!

**Note:** Logging can be found in the directory `./logs/logging.log` and `./logs/cron.log` (if you have set up a cron job, explained below)

# Configuration
Create a `.env` file and paste the following inside the file:

```bash
# Indicate if debugging 
#   Controls the headless option for Playwright and whether to click confirm at booking page
IS_BOOKING_DEBUG=false

# Logging
LOG_LEVEL=info

# Booking Page
BOOKING_PAGE_URL=https://fbs.intranet.smu.edu.sg

# Microsoft Login Details
MSFT_EMAIL=<your SMU email>
MSFT_PWD=<your SMU password>

# Storage State filepath
STORAGESTATE_FP=./playwright/.auth/user.json

# SMU Booking Rules
# 1. Only book from current date and time onwards
# 2. Only book at most 14 days in advance
# 3. Booking start time restricted to between 0830 - 2200
# 4. Booking times are in 30 mins blocks
# 5. Only book for maximum 4 hours
# 6. Require a booking purpose
# 7. Require a co-booker
# 8. Require accepting acknowledgement
# 9. No booking on sundays
# 10. One booking per user per day

# Date to book in fmt YYYY-MM-DD
BOOKING_DATE=2025-09-12

# Time to book in 24hrs, in only 30 mins interval and in this fmt HH:mm
BOOKING_TIME_START=12:00
BOOKING_TIME_END=16:00

# Check the google sheets link for the booking facility name you want
# https://docs.google.com/spreadsheets/d/1WdMjHp8W2zTG1-RfqzGIKNvmNTxZaTqfgU8d_Oxxx2I/edit?usp=sharing
# Remember to put it in double quotes
BOOKING_FACILITY="LKCSB GSR 1-2"

# Booking purpose
# Remember to put it in double quotes
BOOKING_PURPOSE="study"

# Booking co-booker's email
BOOKING_COBOOKER=<co-booker SMU email>
```

Edit the environment variables accordingly.

**Note:** Change `IS_BOOKING_DEBUG=true` and `LOG_LEVEL=debug` when debugging

# Setting up the cron job
Set up a cron job to run this tool everyday (except sundays) at 0000hrs.

Enter the command in the terminal
```bash
$ crontab -e
```

Paste the command below into the cron table file, and save and quit
```bash
0 0 * * 1-6 cd ~/dev/autobooking/run_autobooking.sh && node --env-file=.env main.js >> logs/cron.log 2>&1
```

# Disclaimer

## Disclaimer 1
Please be considerate to other SMU students!!! Please only book the room if you intend to actually use it!

## Disclaimer 2
This tool is best used when you want to book a room at exactly the date (14 days from today) when it releases. This is because the tool will fail if the room you are trying to book is not available. At 0000hrs 14 days from today, you can almost guarantee that the room is available. 

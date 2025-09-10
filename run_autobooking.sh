#!/bin/bash

# Run main script
echo "Running main.js"
node --env-file=.env main.js
main_exit_code=$?
echo "main.js Finished Successfully"

# Only update booking date if main.js succeeded
if [ ${main_exit_code} -eq 0 ]; then
    echo "Updating Booking Date"
    node --env-file=.env updateBookingDate.js
    echo "Booking Date Updated"
    exit
fi
echo "Booking Date Not Updated"

#!/bin/bash

# Run main script
echo "Running main.js"
node --env-file=.env main.js
echo "main.js Finished Successfully"

# Only update booking date if main.js succeeded
echo "Updating Booking Date"
if [ $? -eq 0 ]; then
    node --env-file=.env updateBookingDate.js
fi
echo "Booking Date Updated"

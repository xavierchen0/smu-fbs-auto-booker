#!/bin/bash

# Run main script
echo "Running main.js"
node main.js
echo "main.js Finished Successfully"

# Only update booking date if main.js succeeded
echo "Updating Booking Date"
if [ $? -eq 0 ]; then
    node updateBookingDate.js
fi
echo "Booking Date Updated"

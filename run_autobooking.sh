#!/bin/bash

# Run main script
node main.js

# Only update booking date if main.js succeeded
if [ $? -eq 0 ]; then
    node updateBookingDate.js
fi

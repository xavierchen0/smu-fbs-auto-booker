#!/bin/bash

# Run main script
node --env-file=.env main.js

# Only update booking date if main.js succeeded
if [ $? -eq 0 ]; then
    node --env-file=.env updateBookingDate.js
fi

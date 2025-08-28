#!/bin/bash

# Run main script
node --env-file=.env main.js

# Update booking date
node --env-file=.env updateBookingDate.js

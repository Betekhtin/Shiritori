#!/bin/bash

# Run gateway
x-terminal-emulator -e "node index.js"

# Run services
cd ./services
x-terminal-emulator -e "node player_manager.js"
x-terminal-emulator -e "node room_manager.js"
x-terminal-emulator -e "node game_manager.js"

# Load web-client
# xdg-open "http://localhost:8080"

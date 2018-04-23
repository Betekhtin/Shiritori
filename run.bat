:: Run gateway
cd %~dp0
start "Gateway" cmd /k node index.js
:: Run services
cd services
start "Player manager" cmd /k node player_manager.js
start "Room manager" cmd /k node room_manager.js
start "Game manager" cmd /k node game_manager.js
:: Load web-client
start http://localhost:8080
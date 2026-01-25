# next-best-chess

> A simple web app that uses Stockfish to find the next best move in Chess.

Note that this application won't find the best of the best moves for Chess, but rather heuristically find a really good and suitable move.

**Designed to be run locally, without requiring an internet connection!**

### Instructions
1. Install necessary Node.JS packages via `npm install`.
2. Head to the [Stockfish website](https://stockfishchess.org/) and download the Stockfish engine.
3. Place Stockfish in the folder of the project.
4. Make any necessary changes (e.g. configuration in `index.js` and `.env`, or renaming the Stockfish binary).
5. Run the app (via `npm start`).

### Tested Versions of Stockfish
- Stockfish 17

### Settings Applied
This application uses Stockfish with the following settings:
* CPU: Maximum amount of cores minus 2 by default. However if the user does not have enough cores (e.g. the user has 2 or less cores), the application will only use 1 core.
* RAM: 1/4 of total RAM in device (e.g. 4GB of RAM for a device of 16GB) by default.
* Depth: 25 by default.

This can be altered using `.env` or changing the code in `index.js`.

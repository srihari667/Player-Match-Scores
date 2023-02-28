const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server started at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error ${error.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const convertPlayerDetails = (playerObject) => {
  return {
    playerId: playerObject.player_id,
    playerName: playerObject.player_name,
    totalScore: playerObject.total_score,
    totalFours: playerObject.total_fours,
    totalSixes: playerObject.total_sixes,
  };
};

const convertMatchDetails = (matchObject) => {
  return {
    matchId: matchObject.match_id,
    match: matchObject.match,
    year: matchObject.year,
  };
};

app.get("/players/", async (request, response) => {
  const getPlayersQuery = `
        SELECT
            *
        FROM
            player_details;`;
  const playersArray = await database.all(getPlayersQuery);
  response.send(
    playersArray.map((eachPlayer) => convertPlayerDetails(eachPlayer))
  );
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `
        SELECT 
            * 
        FROM
            player_details
        WHERE
            player_id = ${playerId};`;
  const player = await database.get(getPlayerQuery);
  response.send(convertPlayerDetails(player));
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerDetailsQuery = `
        UPDATE
            player_details
        SET
            player_name = '${playerName}'
        WHERE
            player_id = ${playerId};`;
  await database.run(updatePlayerDetailsQuery);
  response.send("Player Details Updated");
});

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetailsQuery = `
        SELECT
            *
        FROM
            match_details
        WHERE
            match_id = ${matchId};`;
  const match = await database.get(getMatchDetailsQuery);
  response.send(convertMatchDetails(match));
});

app.get("/players/:playerId/matches/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerMatchesQuery = `
        SELECT
            match_details.match_id as match_id,
            match_details.match as match,
            match_details.year as year
        FROM
            player_match_score left join match_details on
            player_match_score.match_id = match_details.match_id
        WHERE
            player_match_score.player_id = ${playerId};`;
  const playerMatchesArray = await database.all(getPlayerMatchesQuery);
  response.send(
    playerMatchesArray.map((eachMatch) => convertMatchDetails(eachMatch))
  );
});

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getMatchPlayersQuery = `
    SELECT
        player_details.player_id as player_id,
        player_details.player_name as player_name
    FROM 
        player_match_score inner join player_details on
        player_match_score.player_id = player_details.player_id
    WHERE
        player_match_score.match_id = ${matchId};`;
  const playerArray = await database.all(getMatchPlayersQuery);
  response.send(
    playerArray.map((eachPlayer) => convertPlayerDetails(eachPlayer))
  );
});

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const playerScoresQuery = `
        SELECT
            player_details.player_id as player_id,
            player_details.player_name as player_name,
            SUM(score) as total_score,
            SUM(fours) as total_fours,
            SUM(sixes) as total_sixes
        FROM 
            player_match_score inner join player_details on
            player_match_score.player_id = player_details.player_id
        WHERE
            player_match_score.player_id = ${playerId}
        GROUP BY player_match_score.player_id;`;
  const playerStats = await database.get(playerScoresQuery);
  response.send(convertPlayerDetails(playerStats));
});

module.exports = app;

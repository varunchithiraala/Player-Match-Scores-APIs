const express = require("express");
const path = require("path");

const {open} = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname,"cricketMatchDetails.db");

const app = express();
app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
    try {
            db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        app.listen(3000, () => 
          console.log("server Running at http://localhost:3000/"));
    } catch(e) {
        console.log(`DB Error: ${e.meassage}`);
        process.exit(1);
    }
};

initializeDBAndServer();

const convertPlayerDBObjectToResponseObject = (dbObject) => {
    return {
        playerId: dbObject.player_id,
        playerName: dbObject.player_name
    };
};

const convertMatchDBObjectToResponseObject = (dbObject) => {
    return {
        matchId: dbObject.match_id,
        match: dbObject.match,
        year: dbObject.year
    };
};

const playerStatsObject = (playerName, statsObj) => {
  return {
    playerId: statsObj.player_id,
    playerName: playerName,
    totalScore: statsObj.totalScore,
    totalFours: statsObj.totalFours,
    totalSixes: statsObj.totalSixes,
  };
};

//Get Players API
app.get("/players/", async (request, response) => {
    const getPlayersQuery = `
    SELECT
      *
    FROM
      player_details
    ORDER BY
      player_id;`;
    const playersArray = await db.all(getPlayersQuery);
    response.send(
        playersArray.map((eachPlayer) => 
          convertPlayerDBObjectToResponseObject(eachPlayer)
        )
    );
});

//Get Player API
app.get("/players/:playerId/", async (request, response) => {
    const {playerId} = request.params;
    const getPlayerQuery = `
    SELECT
      *
    FROM 
      player_details
    WHERE
      player_id = ${playerId};`;
    const playerDetails = await db.get(getPlayerQuery);
    response.send(
        convertPlayerDBObjectToResponseObject(playerDetails)
    );
});

//Add Player API
app.put("/players/:playerId", async (request, response) => {
    const {playerId} = request.params;
    const playerDetails = request.body;
    const {playerName} = playerDetails;
    const updatePlayerQuery = `
    UPDATE
      player_details
    SET
      player_name = '${playerName}'
    WHERE
      player_id = ${playerId};`;
    await db.run(updatePlayerQuery);
    response.send("Player Details Updated");
});

//Get Match API
app.get("/matches/:matchId/", async (request, response) => {
    const {matchId} = request.params;
    const getMatchQuery = `
    SELECT
      *
    FROM 
      match_details
    WHERE
      match_id = ${matchId};`;
    const matchDetails = await db.get(getMatchQuery);
    response.send(convertMatchDBObjectToResponseObject(matchDetails)); 
});

//Get Player Matches API
app.get("/players/:playerId/matches", async (request, response) => {
    const {playerId} = request.params;
    const getPlayerMatchesQuery = `
    SELECT
      *
    FROM
      player_match_score NATURAL JOIN match_details
    WHERE
      player_id = ${playerId};`;
    const playerMatchesDetails = await db.all(getPlayerMatchesQuery);
    response.send(
        playerMatchesDetails.map((eachMatch) => 
            convertMatchDBObjectToResponseObject(eachMatch)
      )
    );
});

//Get Match Players API
app.get("/matches/:matchId/players", async (request, response) => {
    const {matchId} = request.params;
    const getMatchPlayersQuery = `
    SELECT
      *
    FROM
      player_match_score NATURAL JOIN player_details
    WHERE
      match_id = ${matchId};`;
    const matchPlayersDetails = await db.all(getMatchPlayersQuery);
    response.send(
        matchPlayersDetails.map((eachPlayer) =>
          convertPlayerDBObjectToResponseObject(eachPlayer)
        )
    );
});

//Get Player Scores API
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerNameQuery = `
    SELECT player_name
        FROM player_details
    WHERE player_id=${playerId};`;
  const getPlayerName = await db.get(getPlayerNameQuery);
  const getPlayerStatisticsQuery = `
    SELECT 
        player_id,
        sum(score) AS totalScore,
        sum(fours) AS totalFours,
        sum(sixes) AS totalSixes
    FROM 
        player_match_score
    WHERE 
        player_id=${playerId};`;

  const getPlayerStatistics = await db.get(getPlayerStatisticsQuery);
  response.send(
    playerStatsObject(
      getPlayerName.player_name,
      getPlayerStatistics
    )
  );
});

module.exports = app;;
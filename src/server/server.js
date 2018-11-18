// Import random id generator
const v4 = require('uuid/v4');

// Import Express and bodyParser
const express = require('express');
const bodyParser = require('body-parser');

// Import Postgres Client
const db = require('./db');

// Call Express to Generate App
const app = express();

// Configure Express to parse JSON body objects
app.use(bodyParser.json());

// GET /trainer - See All Trainers and Pokemon Count
app.get('/trainer', (req, res) => {
  // Middleware - Query Trainers from DB
  const queryString = 'SELECT * FROM trainers;';
  db.any(queryString)
    .then(dbResponse => res.status(200).json(dbResponse))
    .catch((err) => {
      console.error('Postgres DB Selection Error: ', err);
      return res.sendStatus(500);
    })
});

// GET /pokemon/:trainer? - See All Pokemon for Given Trainer - If no traimer, return all pokemon
app.get('/pokemon/:trainerName?', async (req, res) => {
  // Middleware - If trainer name exists, retrieve trainer id from DB
  let trainerId;
  if (req.params.trainerName) {
    const selectQueryString = 'SELECT trainer_id FROM trainers WHERE trainer_name = $1;';
    const selectQueryArray = [req.params.trainerName.toLowerCase()];
    trainerId = await db.one(selectQueryString, selectQueryArray)
      .then(dbResponse => dbResponse.trainer_id)
      .catch(err => console.error('Postgres DB Selection Error: ', err));
  }
  // Middleware - Query Pokemon For Trainer Id (if exists)“ from DB
  const whereStatement = trainerId ? ` WHERE trainer_id = '${trainerId}'` : '';
  const selectQueryString2 = `SELECT * FROM pokemon${whereStatement};`
  db.any(selectQueryString2)
    .then(dbResponse => res.status(200).json(dbResponse))
    .catch((err) => {
      console.error('Postgres DB Selection Error: ', err);
      return res.status(500).json({error: 'Database Error: Could Not Retrieve Pokemon From Pokemon Table'});
    })
});

// POST /trainer - Create Trainer
app.post('/trainer', (req, res) => {
  // Middleware - Validate Input (confirm fields)
  if (!req.body.trainerName) return res.sendStatus(400);
  // Middleware - Add Trainer to DB
  const queryString = 'INSERT INTO trainers (trainer_id, trainer_name) VALUES ($1, $2) RETURNING *;'
  const queryArray = [v4(), req.body.trainerName.toLowerCase()];
  db.one(queryString, queryArray)
    .then(dbResponse => res.status(200).json(dbResponse))
    .catch((err) => {
      console.error('Postgres DB Insertion Error: ', err);
      return res.status(500).json({error: 'Database Error: Could Not Insert Trainer Into Trainer Table'});
    });
});

// POST /pokemon - Create Pokemon
app.post('/pokemon', async (req, res) => {
  // Middleware - Validate Input (confirm fields)
  if (!req.body.trainerName) return res.status(400).json({error: "Must Provide trainerName"});
  if (!req.body.pokemonType) return res.status(400).json({error: "Must Provide pokemonType"});
  if (!req.body.pokemonImgUrl) return res.status(400).json({error: "Must Provide pokemonImgUrl"});
  // Middleware - Validate Trainer Exists / Retrieve Trainer ID
  const selectQueryString = 'SELECT trainer_id FROM trainers WHERE trainer_name = $1;';
  const selectQueryArray = [req.body.trainerName.toLowerCase()];
  const trainerId = await db.oneOrNone(selectQueryString, selectQueryArray)
    .then((dbResponse) => {
      if (!dbResponse) return res.status(400).json({error: "Trainer Not Found"})
      return dbResponse.trainer_id;
    })
    .catch((err) => {
      console.error('Postgres DB Selection Error: ', err);
      return res.sendStatus(500);
    });
  // Middleware - Increment Trainer Pokemon Count
  const updateQueryString = 'UPDATE trainers SET poke_count = poke_count + 1 WHERE trainer_id = $1;';
  const updateQueryArray = [trainerId];
  await db.none(updateQueryString, updateQueryArray)
    .catch((err) => {
      console.error('Postgres DB Update Error: ', err);
      return res.status(500).json({error: 'Database Error: Could Not Update Trainer Pokemon Count'});
    });
  // Middleware - Add Pokemon to DB
  const insertQueryString = 'INSERT INTO pokemon (pokemon_id, trainer_id, pokemon_type, pokemon_image_url) VALUES ($1, $2, $3, $4) RETURNING *;';
  const insertQueryArray = [v4(), trainerId, req.body.pokemonType, req.body.pokemonImgUrl];
  db.one(insertQueryString, insertQueryArray)
    .then((dbResponse) => res.status(200).json(dbResponse))
    .catch((err) => {
      console.error('Postgres DB Insertion Error: ', err);
      return res.status(500).json({error: 'Database Error: Could Not Insert Pokemon Into Pokemon Table'});
    });
});

// PATCH /trainer - Rename Trainer
app.patch('/trainer', async (req, res) => {
  // Middleware - Valiate Input (confirm fields)
  if (!req.body.trainerName) return res.status(400).json({error: "Must Provide trainerName"});
  if (!req.body.newName) return res.status(400).json({error: "Must Provide newName"});
  // Middleware - Confirm Trainer Exists | Retrieve Trainer ID
  const selectQueryString = 'SELECT trainer_id FROM trainers WHERE trainer_name = $1;';
  const selectQueryArray = [req.body.trainerName.toLowerCase()];
  const trainerId = await db.oneOrNone(selectQueryString, selectQueryArray)
    .then((dbResponse) => {
      if (!dbResponse) return res.status(400).json({error: "Trainer Not Found"})
      return dbResponse.trainer_id;
    })
    .catch((err) => {
      console.error('Postgres DB Selection Error: ', err);
      return res.sendStatus(500);
    });
  // Middleware - Rename Trainer
  const updateQueryString = 'UPDATE trainers SET trainer_name = $1 WHERE trainer_id = $2 RETURNING *;'
  const updateQueryArray = [req.body.newName.toLowerCase(), trainerId];
  db.one(updateQueryString, updateQueryArray)
    .then(dbresponse => res.status(200).json(dbresponse))
    .catch((err) => {
      console.error('Postgres DB Update Error: ', err);
      return res.sendStatus(500);
    });
});

// PATCH /pokemon - Level Up Pokemon
app.patch('/pokemon', async (req, res) => {
  // Middleware - Valiate Input (confirm fields)
  if (!req.body.trainerName) return res.status(400).json({error: "Must Provide trainerName"});
  if (!req.body.pokemonType) return res.status(400).json({error: "Must Provide pokemonType"});
  // Middleware - Confirm Trainer Exists | Retrieve Trainer Id
  const selectQueryString = 'SELECT trainer_id FROM trainers WHERE trainer_name = $1;';
  const selectQueryArray = [req.body.trainerName.toLowerCase()];
  const trainerId = await db.oneOrNone(selectQueryString, selectQueryArray)
    .then((dbResponse) => {
      if (!dbResponse) return res.status(400).json({error: "Trainer Not Found"})
      return dbResponse.trainer_id;
    })
    .catch((err) => {
      console.error('Postgres DB Selection Error: ', err);
      return res.sendStatus(500);
    });
  // Middleware - Confirm Pokemon Exists | Retrieve Pokemon Id
  const selectQueryString2 = 'SELECT pokemon_id FROM pokemon WHERE trainer_id = $1 AND pokemon_type = $2;';
  const selectQueryArray2 = [trainerId, req.body.pokemonType];
  const pokemonId = await db.oneOrNone(selectQueryString2, selectQueryArray2)
    .then((dbResponse) => {
      if (!dbResponse) return res.status(400).json({error: "Pokemon Not Found"})
      return dbResponse.pokemon_id;
    })
    .catch((err) => {
      console.error('Postgres DB Selection Error: ', err);
      return res.sendStatus(500);
    });
  // Middleware - Level Up Pokemon
  const updateQueryString = 'UPDATE pokemon SET pokemon_level = pokemon_level + 1 WHERE pokemon_id = $1 RETURNING *;';
  const updateQueryArray = [pokemonId];
  db.one(updateQueryString, updateQueryArray)
    .then(dbResponse => res.status(200).json(dbResponse))
    .catch((err) => {
      console.error('Postgres DB Update Error: ', err);
      return res.status(500).json({error: 'Database Error: Could Not Update Pokemon Level'});
    })
});

// PATCH /trade - Trade Two Pokemon Among Trainers

// DELETE /pokemon - Release Pokemon
app.delete('/pokemon', async (req, res) => {
  // Middleware - Valiate Input (confirm fields)
  if (!req.body.trainerName) return res.status(400).json({error: "Must Provide trainerName"});
  if (!req.body.pokemonType) return res.status(400).json({error: "Must Provide pokemonType"});
  // Middleware - Confirm Trainer Exists | Retrieve Trainer Id
  const selectQueryString = 'SELECT trainer_id FROM trainers WHERE trainer_name = $1;';
  const selectQueryArray = [req.body.trainerName.toLowerCase()];
  const trainerId = await db.oneOrNone(selectQueryString, selectQueryArray)
    .then((dbResponse) => {
      if (!dbResponse) return res.status(400).json({error: "Trainer Not Found"})
      return dbResponse.trainer_id;
    })
    .catch((err) => {
      console.error('Postgres DB Selection Error: ', err);
      return res.sendStatus(500);
    });
  // Middleware - Confirm Pokemon Exists | Retrieve Pokemon Id
  const selectQueryString2 = 'SELECT pokemon_id FROM pokemon WHERE trainer_id = $1 AND pokemon_type = $2;';
  const selectQueryArray2 = [trainerId, req.body.pokemonType];
  const pokemonId = await db.oneOrNone(selectQueryString2, selectQueryArray2)
    .then((dbResponse) => {
      if (!dbResponse) return res.status(400).json({error: "Pokemon Not Found"})
      return dbResponse.pokemon_id;
    })
    .catch((err) => {
      console.error('Postgres DB Selection Error: ', err);
      return res.sendStatus(500);
    });
  // Middleware - Decrement Trainer Pokemon Count
  const updateQueryString = 'UPDATE trainers SET poke_count = poke_count - 1 WHERE trainer_id = $1;';
  const updateQueryArray = [trainerId];
  await db.none(updateQueryString, updateQueryArray)
    .catch((err) => {
      console.error('Postgres DB Update Error: ', err);
      return res.status(500).json({error: 'Database Error: Could Not Update Trainer Pokemon Count'});
    });
  // Middleware - Release Pokemon
  const deleteQueryString = 'DELETE FROM pokemon WHERE pokemon_id = $1 RETURNING *;';
  const deleteQueryArray = [pokemonId];
  db.one(deleteQueryString, deleteQueryArray)
    .then(dbResponse => res.status(200).json(dbResponse))
    .catch((err) => {
      console.error('Postgres DB Deletion Error: ', err);
      return res.sendStatus(500);
    });
});

// DELETE /trainer - Retire Trainer
app.delete('/trainer', async (req, res) => {
  // Middleware - Valiate Input (confirm fields)
  if (!req.body.trainerName) return res.status(400).json({error: "Must Provide trainerName"});
  // Middleware - Confirm Trainer Exists | Retrieve Trainer Id
  const selectQueryString = 'SELECT trainer_id FROM trainers WHERE trainer_name = $1;';
  const selectQueryArray = [req.body.trainerName.toLowerCase()];
  const trainerId = await db.oneOrNone(selectQueryString, selectQueryArray)
    .then((dbResponse) => {
      if (!dbResponse) return res.status(400).json({error: "Trainer Not Found"})
      return dbResponse.trainer_id;
    })
    .catch((err) => {
      console.error('Postgres DB Selection Error: ', err);
      return res.sendStatus(500);
    });
  // Middleware - Release All Trainer's Pokemon
  const deleteQueryString = 'DELETE FROM pokemon WHERE trainer_id = $1;';
  const deleteQueryArray = [trainerId];
  await db.none(deleteQueryString, deleteQueryArray)
    .catch((err) => {
      console.error('Postgres DB Deletion Error: ', err);
      return res.sendStatus(500);
    });
  // Middleware - Retire Trainer
  const deleteQueryString2 = 'DELETE FROM trainers WHERE trainer_id = $1 RETURNING *;';
  const deleteQueryArray2 = [trainerId];
  db.one(deleteQueryString2, deleteQueryArray2)
    .then(dbResponse => res.status(200).json(dbResponse))
    .catch((err) => {
      console.error('Postgres DB Deletion Error: ', err);
      return res.sendStatus(500);
    });
})

// Activate server
app.listen(process.env.PORT, () => console.log(`Server listening on Port: ${process.env.PORT}`));




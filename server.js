// Import the installed modules.
const newRelic = require('newrelic');
const express = require('express');
const responseTime = require('response-time')
const axios = require('axios');
const redis = require('redis');
const cors = require('cors');

const app = express();

// create and connect redis client to local instance.
const client = redis.createClient();

// Print redis errors to the console
client.on('error', (err) => {
  console.log("Error " + err);
});

// use response-time as a middleware
app.use(responseTime());
app.use(cors());


// create an api/search route
app.get('/cars/:id', (req, res) => {
  // Extract the query from url and trim trailing spaces
  // const query = (req.query.query).trim();
  const id = req.params.id
  // Build the Wikipedia API url
  const searchUrl = `http://localhost:3001/cars/${id}`;

  // Try fetching the result from Redis first in case we have it cached
  return client.get(`car-carousel:${id}`, (err, result) => {
    // If that key exist in Redis store
    if (result) {
      const resultJSON = JSON.parse(result);
      return res.status(200).json([resultJSON[0]]);
    } else { // Key does not exist in Redis store
      // Fetch directly from Wikipedia API
      return axios.get(searchUrl)
        .then(response => {
          const responseJSON = response.data;
          // Save the Wikipedia API response in Redis store
          client.setex(`car-carousel:${id}`, 3600, JSON.stringify({ source: 'Redis Cache', ...responseJSON, }));
          // Send JSON response to client
          return res.status(200).json([responseJSON[0]]);
        })
        .catch(err => {
          return res.json(err);
        });
    }
  });
});

app.listen(2999, () => {
  console.log('Server listening on port: ', 2999);
});
require('dotenv').config(); // Load .env file

const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

// Log your API key to confirm it's working
console.log('My API key is:', process.env.API_KEY);

app.get('/', (req, res) => {
  res.send('API is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

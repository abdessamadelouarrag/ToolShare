require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const Installation = require('./src/models/Installation');
const installationRouter = require('./src/routes/installationRouter');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'ToolShare API is running' });
});

app.get('/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'unavailable',
    database: connected ? 'connected' : 'disconnected',
  });
});

app.use('/api/installation', installationRouter);

async function start() {
  await connectDB();
  await Installation.init();

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`ToolShare API listening on port ${port}`);
  });

  const shutdown = () => {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((error) => {
  console.error(`Unable to start ToolShare: ${error.message}`);
  process.exit(1);
});

const redis = require('redis');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const redisEnabled = (process.env.REDIS_ENABLED || 'false').toLowerCase() === 'true';

if (!redisEnabled) {
  module.exports = null;
  return;
}

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500)
  }
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

module.exports = redisClient;

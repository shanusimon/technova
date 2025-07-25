const { createClient } = require("redis");
const env = require("dotenv").config();

const client = createClient({
  username: "default",
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: 13900,
  },
});


client.on('error', (err) => console.error('Redis Client Error', err))
async function connectRedis() {
  if (!client.isOpen) {
    await client.connect();
  }
}
module.exports = { client, connectRedis };

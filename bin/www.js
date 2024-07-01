import Koa from "koa";
import bodyParser from "koa-bodyparser";
import { createClient } from "redis";
import NodeCache from "node-cache";
import randomString from "randomstring";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file located one folder above
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  throw Error("environment variable TOKEN is missing");
}
const PORT = process.env.PORT || 3000;
let ID_LENGTH = process.env.ID_LENGTH;
if (ID_LENGTH) {
  ID_LENGTH = parseInt(ID_LENGTH);
  if (isNaN(ID_LENGTH))
    throw Error("environment variable ID_LENGTH is not a number");
} else {
  ID_LENGTH = 3;
}
const STORAGE = process.env.STORAGE === "redis" ? "redis" : "memory";

// Create a new Koa application, in-memory storage and redis client
const app = new Koa();
const cache = new NodeCache();
const redisClient = createClient();

/**
 * Use body parser middleware
 */
app.use(bodyParser());

/**
 * Error handler
 */
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.log(`Error: ${err.message}`);
    err.status = err.statusCode || err.status || 500;
    ctx.body = { status: "error", error: err.message };
  } finally {
    console.log(
      `${ctx.request.method} ${ctx.request.originalUrl} - ${ctx.response.status}`
    );
  }
});

/**
 * Routing
 */
app.use(async (ctx) => {
  if (ctx.method === "GET") {
    await retrieve(ctx);
  } else if (ctx.method === "POST") {
    await submit(ctx);
  } else {
    ctx.status = 400;
    throw Error(`invalid HTTP method: ${ctx.method}`);
  }
});

/**
 * New submission
 * @param ctx
 * @returns {Promise<void>}
 */
async function submit(ctx) {
  // validate token
  const token = ctx.get("token");
  if (token !== TOKEN) {
    ctx.status = 403;
    ctx.body = { error: "access denied, token is missing" };
    return;
  }
  // get and check the url
  const url = ctx.request.body.url;
  if (!url) {
    ctx.status = 400;
    throw Error("url is missing");
  }
  // check if id was given
  let id = ctx.request.body.id;
  if (id && !id.match(/^[0-9a-zA-Z_-]+$/)) {
    throw Error("accepted characters for id are: [0-9a-zA-Z_-]");
  }
  if (id) {
    // check if it exists in storage
    const data = await getStorage(id);
    if (data) {
      ctx.status = 400;
      throw Error("given id already exists");
    }
    await setStorage(id, url);
    // respond to request
    ctx.body = { status: "success", url, id };
    return;
  }

  // generate a random id for it
  id = randomString.generate(ID_LENGTH);

  // make sure id does not exist in storage, retry if it exists for a few times
  let exists = true;
  for (let i = 0; i < 5; i++) {
    const data = await getStorage(id);
    if (!data) {
      exists = false;
      break;
    }
    id = randomString.generate(ID_LENGTH);
  }
  // if it still exists, throw error
  if (exists) {
    ctx.status = 400;
    throw Error("id generation exhausted");
  }
  await setStorage(id, url);
  // respond to request
  ctx.body = { status: "success", url, id };
}

/**
 * Retrieve a URL from storage by id
 * @param ctx
 * @returns {Promise<void>}
 */
async function retrieve(ctx) {
  const id = ctx.req.url.replace("/", "");
  const data = await getStorage(id.replace("+", ""));
  if (!data) {
    ctx.status = 400;
    throw Error("url with given id does not exist");
  }

  // if it ends with +, return statistics
  if (id.endsWith("+")) {
    ctx.body = {
      status: "success",
      visits: data.visits,
      url: data.url,
      id: id.replace("+", ""),
    };
    return;
  }

  // increase visits for id
  if (STORAGE === "redis") {
    await redisClient.set(
      id,
      JSON.stringify({ url: data.url, visits: data.visits + 1 })
    );
  } else {
    cache.set(id, { url: data.url, visits: data.visits + 1 });
  }
  // and redirect to url
  ctx.redirect(data.url);
}

/**
 * Retrieve from storage, in-memory or redis
 * @param id
 * @returns {Promise<void>}
 */
async function getStorage(id) {
  if (STORAGE === "redis") {
    let data = await redisClient.get(id);
    // if data exists, parse it to JSON
    if (data) {
      data = JSON.parse(data);
    }
    return data;
  } else {
    return cache.get(id);
  }
}

/**
 * Persist to storage, in-memory or redis
 * @returns {Promise<void>}
 */
async function setStorage(id, url) {
  if (STORAGE === "redis") {
    await redisClient.set(id, JSON.stringify({ url, visits: 0 }));
  } else {
    cache.set(id, { url, visits: 0 });
  }
}

/**
 * Main function - start the server and connect to redis if needed
 */
async function main() {
  if (STORAGE === "redis") {
    await redisClient.connect();
    console.log("[+] Redis DB connected");
  } else {
    console.log("[+] In-memory storage");
  }
  await app.listen(PORT);
  console.log(`[+] HTTP server running on http://127.0.0.1:${PORT}`);
}

main();


const Koa = require("koa");
const route = require("koa-route");
const koaHelmet = require("koa-helmet");
const koaCors = require("koa-cors");

const app = new Koa();
app.use(koaCors());
app.use(koaHelmet());

const { MongoClient } = require("mongodb");

const MONGODB_URL = process.env.MONGODB_URI;
const MONGODB_DATABASE = "heroku_14f4t5lp";
const PORT = process.env.PORT;

async function getDB() {
  try {
    const client = await MongoClient.connect(MONGODB_URL, { useNewUrlParser: true });
    return client.db(MONGODB_DATABASE);
  }
  catch(e) {
    console.log("Mongodb failed to connect!")
    // Failed to connect!
    return false;
  }
}

async function initDB() {
  try {
    let db = await getDB();

    while (!db) {
      // Database failed to connect, retry in 10 seconds.
      await (new Promise(resolve => setTimeout(resolve, 1000 * 10)));
      db = await getDB();
    }

    return {
      async getScoreboard() {
        return await db.collection('scoreboard').find({}, { projection: {_id: 0, name: 1, score: 1} }).sort({ score: -1 }).toArray();
      },
      async addScoreboard(name, score) {
        return await db.collection('scoreboard').updateOne({name}, { $set: {name, score}}, { upsert: true });
      }
    }
  }
  catch(e) {
    console.log("Failed to connect to Mongodb");
    return false;
  }
}

const getScoreboard = async ctx => {
  try {
    ctx.body = await ctx.db.getScoreboard();
  }
  catch (e) {
    console.log(e);
    ctx.body = "error";
  }
}

const addScoreboard = async (ctx, name, score) => {
  try {
    await ctx.db.addScoreboard(name, parseInt(score, 10));
    ctx.body = "success";
  }
  catch (e) {
    console.log(e);
    ctx.body = "error";
  }
}

app.use(route.get("/get_list", getScoreboard));
app.use(route.get("/add_score/:name/:score", addScoreboard));

app.init = async function() {
  this.context.db = await initDB();

  this.listen(PORT);
  console.log("Server started at port", port);
}

app.init();

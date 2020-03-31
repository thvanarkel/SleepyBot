const dotenv = require('dotenv').config()
const botgram = require("botgram")
const bot = botgram(process.env.APITOKEN)
const {InfluxDB, Point, FluxTableMetaData} = require('@influxdata/influxdb-client')

const dbClient = new InfluxDB({url: process.env.HOST, token: process.env.TOKEN})

var cron = require('node-cron');



console.log("Started")

bot.command("start", "help", (msg, reply) => {
  reply.text("Hi there! I'm a bot that will help you take charge of your bedtime routines! Are you ready to embark on a journey?")
  reply.text("To schedule an alert, do: /alert <seconds> <text>")
  console.log(msg)
})

bot.command("alert", (msg, reply, next) => {
  var [ seconds, text ] = msg.args(2)
  if (!seconds.match(/^\d+$/) || !text) return next()

  setTimeout(() => reply.text(text), Number(seconds) * 1000)
})

var keyboard1 = [[  "🚀" ], [ "Beam me up!" ]];

bot.text(function (msg, reply, next) {
  console.log("Received a text message:", msg.text);
  logMessage(msg)

  reply.keyboard(keyboard1, false).text("hello!").then((err, result) => {
    if (err) {
      console.error("Sending message failed!");
    } else {
      logMessage(result)
    }
  });
});

bot.command((msg, reply) =>
  reply.text("Invalid command."))


// bot.reply(1083726752).text("HIYAA")


var task = cron.schedule('0 57 14 * * *', () =>  {
  bot.reply(1083726752).text("HIYAA").then((err, result) => {
    if (err) {
      console.error("Sending message failed!");
    } else {
      logMessage(result)
    }
  });
  console.log(this)
  task.destroy()
}, {
  scheduled: true
});

var logMessage = function(msg) {
  const point = new Point("message")
    .tag("thing", "bot")
    .timestamp(String(msg.date.getTime()))
    .tag("sender", msg.from.name)
    .tag("chatID", msg.chat.id)
    .stringField("message", msg.text)

  console.log(`${point}`)
  const writeApi = dbClient.getWriteApi(process.env.ORG, process.env.BUCKET, 'ms')
  // writeApi.useDefaultTags({location: hostname()})
  writeApi.writePoint(point)
  writeApi
    .close()
    .then(() => {
      // console.log("pushed " + this.points.length + " to online database")
      // aLog.toOnline = aLog.toOnline + this.points.length;
      // this.points = []
    })
}

// task.start();

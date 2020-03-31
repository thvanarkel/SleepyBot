const botgram = require("botgram")
const bot = botgram("1095782983:AAFw5ojhwHt6YyQK-Y93vEJ9bPT2DLLq71A")

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
  reply.keyboard(keyboard1, false).text("hello!");
});

bot.command((msg, reply) =>
  reply.text("Invalid command."))


// bot.reply(1083726752).text("HIYAA")


var task = cron.schedule('0 10 18 * * *', () =>  {
  bot.reply(1083726752).text("HIYAA");
  console.log(this)
  task.destroy()
}, {
  scheduled: true
});

// task.start();

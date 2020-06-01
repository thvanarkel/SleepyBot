const dotenv = require('dotenv').config();
// const {
// 	InfluxDB,
// 	Point,
// 	FluxTableMetaData
// } = require('@influxdata/influxdb-client');
// const cron = require('node-cron');

const Telegraf = require('telegraf')
const session = require('telegraf/session')
const Stage = require('telegraf/stage')
const Scene = require('telegraf/scenes/base')
const WizardScene = require('telegraf/scenes/wizard');
const cron = require('node-cron');

// Handler factoriess
const { enter, leave } = Stage

const state = {}


// Greeter scene
const greeterScene = new Scene('greeter')
greeterScene.enter((ctx) => ctx.reply('Hi'))
greeterScene.leave((ctx) => ctx.reply('Bye'))
greeterScene.hears('hi', enter('greeter'))
greeterScene.on('message', (ctx) => ctx.replyWithMarkdown('Send `hi`'))

// Echo scene
const echoScene = new Scene('echo')
echoScene.enter((ctx) => ctx.reply('echo scene'))
echoScene.leave((ctx) => ctx.reply('exiting echo scene'))
echoScene.command('back', leave())
echoScene.on('text', (ctx) => ctx.reply(ctx.message.text))
echoScene.on('message', (ctx) => ctx.reply('Only text messages please'))

const authenticator = new WizardScene(
  'authenticate', // first argument is Scene_ID, same as for BaseScene
  (ctx) => {
    ctx.reply(`As I'm still in an experimental condition I can only be tested if you have the correct passcode. What is the passcode?`);
    ctx.wizard.state.contactData = {};
    return ctx.wizard.next();
  },
  (ctx) => {
    // validation
    if (ctx.message.text != process.env.AUTH_PIN) {
      ctx.reply('Invalid PIN');
      return;
    }
    ctx.wizard.state.contactData.fio = ctx.message.text;
    state.chatID = ctx.message.chat.id;
    ctx.reply('Thanks, what is your name?');
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.contactData.email = ctx.message.text;
    state.task.start();
    ctx.reply(`Thank you for your replies, we'll contact your soon`);
    // await mySendContactDataMomentBeforeErase(ctx.wizard.state.contactData);
    return ctx.scene.leave();
  },
);

const setup = new WizardScene(
  'setup', // first argument is Scene_ID, same as for BaseScene
  (ctx) => {
    ctx.reply('What is your name?');
    ctx.wizard.state.contactData = {};
    return ctx.wizard.next();
  },
  (ctx) => {
    // validation example
    if (ctx.message.text.length < 2) {
      ctx.reply('Please enter name for real');
      return;
    }
    ctx.wizard.state.contactData.fio = ctx.message.text;
    ctx.reply('Enter your e-mail');
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.contactData.email = ctx.message.text;
    ctx.reply(`Thank you for your replies, we'll contact your soon`);
    // await mySendContactDataMomentBeforeErase(ctx.wizard.state.contactData);
    return ctx.scene.leave();
  },
);

const bot = new Telegraf(process.env.BOT_TOKEN)
const stage = new Stage([setup, authenticator, greeterScene, echoScene, ], { ttl: 10 })
bot.use(session())
bot.use(stage.middleware())
bot.command('greeter', (ctx) => ctx.scene.enter('greeter'))
bot.command('echo', (ctx) => ctx.scene.enter('echo'))
bot.command('wizard', (ctx) => ctx.scene.enter('wizard'))
bot.command('/start', async (ctx) => {
  ctx.reply("Hi there! I'm a bot that will help you take charge of your bedtime routines! Are you ready to embark on a journey?")
  await ctx.replyWithAnimation('CgACAgQAAxkBAAICZV7VE_ZiduYntjIP8pVmS8XRoWFBAAL5AQAC07OsUktiyspJZF1CGQQ')
  ctx.scene.enter('authenticate')
})
bot.on("message", (ctx) => {
  console.log()
})
bot.launch()



//
//
// console.log("Started")
//

//
//
// //
// bot.command("start", "help", (msg, reply) => {
//   fsm.reset()
//   reply.text("Hi there! I'm a bot that will help you take charge of your bedtime routines! Are you ready to embark on a journey?")
//
//   reply.text("As I'm still in an experimental condition I can only be tested if you have the correct passcode. What is the passcode?")
//   // reply.text("To schedule an alert, do: /alert <seconds> <text>")
//   // console.log(msg)
// })
// //
// bot.context({ presses: 0 });
//
// bot.command("press", (msg, reply, next) => {
//   msg.context.presses++;
//   reply.text("Button has been pressed.");
// });
//
// bot.command("count", (msg, reply, next) => {
//   reply.text("The button has been pressed " + msg.context.presses + " times in this chat.");
// });
//
// // bot.command("alert", (msg, reply, next) => {
// //   var [ seconds, text ] = msg.args(2)
// //   if (!seconds.match(/^\d+$/) || !text) return next()
// //
// //   setTimeout(() => reply.text(text), Number(seconds) * 1000)
// // })
//
// var keyboard1 = [[  "🚀" ], [ "Beam me up!" ]];
//
// bot.text(function (msg, reply, next) {
//   console.log("Received a text message:", msg);
//   // logMessage(msg)
//
//   if (fsm.can('authenticate')) {
//     fsm.authenticate(msg);
//   }
//
//   // reply.keyboard(keyboard1, false).text("hello!").then((err, result) => {
//   //   if (err) {
//   //     console.error("Sending message failed!");
//   //   } else {
//   //     // logMessage(result)
//   //   }
//   // });
// });
//
// bot.command("setup", (msg, reply, next) => {
//   reply.text("Initiating setup sequence in 3 2 1!");
// });
//
// bot.command("help", (msg, reply, next) => {
//   reply.text("Help!");
// });
//
// // bot.command((msg, reply) =>
// //   reply.text("Invalid command."))
//
//
// // bot.reply(1083726752).text("HIYAA")
//
//
state.task = cron.schedule('*/2 * * * * *', () =>  {
  bot.telegram.sendMessage(state.chatID, "test");
  //
  // bot.reply(1083726752).text("test").then((err, result) => {
  //   bot.context.state = 1;
  //   if (err) {
  //     console.error("Sending message failed!");
  //   } else {
  //     // logMessage(result)
  //   }
  // });
  console.log("cron")
  // task.destroy()
}, {
  scheduled: false
});

// state.task.start();
//
// // var logMessage = function(msg) {
// //   const point = new Point("message")
// //     .tag("thing", "bot")
// //     .timestamp(String(msg.date.getTime()))
// //     .tag("sender", msg.from.name)
// //     .tag("chatID", msg.chat.id)
// //     .stringField("message", msg.text)
// //
// //   console.log(`${point}`)
// //   const writeApi = dbClient.getWriteApi(process.env.ORG, process.env.BUCKET, 'ms')
// //   // writeApi.useDefaultTags({location: hostname()})
// //   writeApi.writePoint(point)
// //   writeApi
// //     .close()
// //     .then(() => {
// //       // console.log("pushed " + this.points.length + " to online database")
// //       // aLog.toOnline = aLog.toOnline + this.points.length;
// //       // this.points = []
// //     })
// // }
//
// // task.start();

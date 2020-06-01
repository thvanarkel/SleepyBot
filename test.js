const dotenv = require('dotenv').config()

const Telegraf = require('telegraf')
const session = require('telegraf/session')
const Stage = require('telegraf/stage')
const Scene = require('telegraf/scenes/base')
const WizardScene = require('telegraf/scenes/wizard');

// Handler factoriess
const { enter, leave } = Stage

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

const contactDataWizard = new WizardScene(
  'wizard', // first argument is Scene_ID, same as for BaseScene
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
const stage = new Stage([greeterScene, echoScene, contactDataWizard], { ttl: 10 })
bot.use(session())
bot.use(stage.middleware())
bot.command('greeter', (ctx) => ctx.scene.enter('greeter'))
bot.command('echo', (ctx) => ctx.scene.enter('echo'))
bot.command('wizard', (ctx) => ctx.scene.enter('wizard'))
bot.on('message', (ctx) => ctx.reply('Try /echo, /wizard or /greeter'))
bot.launch()






// const
//   Telegraf = require('telegraf'),
//   LocalSession = require('telegraf-session-local')
//
// const bot = new Telegraf(process.env.BOT_TOKEN) // Your Bot token here
//
// // Name of session property object in Telegraf Context (default: 'session')
// const property = 'data'
//
// const localSession = new LocalSession({
//   // Database name/path, where sessions will be located (default: 'sessions.json')
//   database: 'example_db.json',
//   // Name of session property object in Telegraf Context (default: 'session')
//   property: 'session',
//   // Type of lowdb storage (default: 'storageFileSync')
//   storage: LocalSession.storageFileAsync,
//   // Format of storage/database (default: JSON.stringify / JSON.parse)
//   format: {
//     serialize: (obj) => JSON.stringify(obj, null, 2), // null & 2 for pretty-formatted JSON
//     deserialize: (str) => JSON.parse(str),
//   },
//   // We will use `messages` array in our database to store user messages using exported lowdb instance from LocalSession via Telegraf Context
//   state: { messages: [] }
// })
//
// // Wait for database async initialization finished (storageFileAsync or your own asynchronous storage adapter)
// localSession.DB.then(DB => {
//   // Database now initialized, so now you can retrieve anything you want from it
//   console.log('Current LocalSession DB:', DB.value())
//   // console.log(DB.get('sessions').getById('1:1').value())
// })
//
// // Telegraf will use `telegraf-session-local` configured above middleware with overrided `property` name
// bot.use(localSession.middleware(property))
//
// bot.on('text', (ctx, next) => {
//   ctx[property].counter = ctx[property].counter || 0
//   ctx[property].counter++
//   ctx.replyWithMarkdown(`Counter updated, new value: \`${ctx.session.counter}\``)
//   // Writing message to Array `messages` into database which already has sessions Array
//   ctx[property + 'DB'].get('messages').push([ctx.message]).write()
//   // `property`+'DB' is a name of property which contains lowdb instance, default = `sessionDB`, in current example = `dataDB`
//   // ctx.dataDB.get('messages').push([ctx.message]).write()
//
//   return next()
// })
//
// bot.command('/stats', (ctx) => {
//   let msg = `Using session object from [Telegraf Context](http://telegraf.js.org/context.html) (\`ctx\`), named \`${property}\`\n`
//   msg += `Database has \`${ctx[property].counter}\` messages from @${ctx.from.username || ctx.from.id}`
//   ctx.replyWithMarkdown(msg)
// })
// bot.command('/remove', (ctx) => {
//   ctx.replyWithMarkdown(`Removing session from database: \`${JSON.stringify(ctx[property])}\``)
//   // Setting session to null, undefined or empty object/array will trigger removing it from database
//   ctx[property] = null
// })
//
// bot.startPolling()

const dotenv = require('dotenv').config();
// const {
// 	InfluxDB,
// 	Point,
// 	FluxTableMetaData
// } = require('@influxdata/influxdb-client');
// const cron = require('node-cron');

const Telegraf = require('telegraf')
const session = require('telegraf/session')
const Composer = require('telegraf/composer')
const { Extra, Markup } = require('telegraf')
const Stage = require('telegraf/stage')
const Scene = require('telegraf/scenes/base')
const WizardScene = require('telegraf/scenes/wizard');
const Keyboard = require('telegraf-keyboard');
const cron = require('node-cron');

// Handler factoriess
const {
	enter,
	leave
} = Stage

const state = {
  selectedDays: [0, 0, 0, 0, 0, 0, 0],
	selectedAlarmDays: [0, 0, 0, 0, 0, 0, 0],
  weekDays: ["ma", "di", "wo", "do", "vr", "za", "zo"]
}

const authenticate = new WizardScene(
	'authenticate', // first argument is Scene_ID, same as for BaseScene
	(ctx) => {
		ctx.reply(`Omdat ik nog in een experimentele fase ben heb je een pincode nodig om mij te kunnen gebruiken. Wat is de pincode?`);
		return ctx.wizard.next();
	},
	async (ctx) => {
		// validation
		if (ctx.message.text != process.env.AUTH_PIN) {
			ctx.reply('Incorrecte pincode');
			return;
		}
		state.chatID = ctx.message.chat.id;
		await ctx.reply('Dat is correct!');
		return next(ctx, true);
	},
	(ctx) => {
		ctx.reply('Met wie heb ik het genoegen om kennis te maken?');
		return next(ctx, false);
	},
	async (ctx) => {
		if (ctx.message.text.length < 2) {
			ctx.reply('Is dat je echte naam?');
			return back(ctx, true);
		}
		state.name = ctx.message.text;
		await ctx.reply(`Hi ${state.name}!`);
		ctx.reply('Ik ben SleepyBot, jouw digitale bedtijdassistent. Ik ga je ondersteunen bij een gebalanceerd slaapritme!')
		return ctx.scene.enter('setup');
	},
);

const next = (ctx, instant) => {
	if (instant) {
		ctx.wizard.next();
		return ctx.wizard.steps[ctx.wizard.cursor](ctx)
	}
	return ctx.wizard.next();
}

const back = (ctx, instant) => {
	if (instant) {
		ctx.wizard.back();
		return ctx.wizard.steps[ctx.wizard.cursor](ctx)
	}
	return ctx.wizard.back();
}

const setup = new WizardScene(
	'setup', // first argument is Scene_ID, same as for BaseScene
	async (ctx) => {
		state.configured = false;
		state.chatID = ctx.message.chat.id;
		await ctx.reply('Laten we beginnen met configuren.')
		await ctx.reply('Wetenschappelijk onderzoek heeft aangetoond dat op regelmatige tijden naar bed gaan en opstaan werkt om beter te slapen.')
		ctx.reply('Hoe laat wil je in bed liggen om te slapen?', Extra.markup(Markup.removeKeyboard()));
		return next(ctx, false);
	},
	(ctx) => {
		const re = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!re.test(ctx.message.text)) {
      ctx.reply("Geef een tijdstip op, in de vorm uu:mm")
			console.log("wrong date");
			return back(ctx, true);
    }
		state.bedtime = ctx.message.text;
		return next(ctx, true)
	},
  async (ctx) => {
		ctx.wizard.state.keyboard = new Keyboard()
  		.add('1 min', '5 min', '10 min', '20 min')
  		.add('30 min', '45 min', '60 min')

		if (state.bedtime.slice(':')[0] < 10) {
			await ctx.reply('Het is daarnaast ook goed voor je nachtrust om al een tijdje daarvoor je bed in te duiken om een ontspannende activiteit te ondernemen zoals een boek lezen of de dag te overdenken.')
			ctx.reply('Hoe veel minuten van tevoren zal ik je hieraan herinneren?', ctx.wizard.state.keyboard.draw());
		} else {
			await ctx.reply('Dat is wel wat aan de late kant!');
			await ctx.reply('Het is daarnaast ook goed voor je nachtrust om al een tijdje daarvoor je bed in te duiken om een ontspannende activiteit te ondernemen zoals een boek lezen of de dag te overdenken.')
			ctx.reply('Hoe veel minuten van tevoren zal ik je hieraan herinneren?', ctx.wizard.state.keyboard.draw());
		}
		return next(ctx, false)
	},
	async (ctx) => {
		console.log(ctx.message.text);
		state.bedtimeNotification = ctx.message.text.replace(/[^0-9]/g, '');
		if (state.bedtimeNotification.length <= 0) {
			ctx.reply("Geef het aantal minuten op als een getal.")
			return back(ctx, true);
		}
		await ctx.reply("Staat genoteerd!", ctx.wizard.state.keyboard.clear()); //Extra.markup(Markup.removeKeyboard()));
		console.log(state.bedtimeNotification)
		return next(ctx, true)
  },
	(ctx) => {
		state.currentDays = state.selectedDays;
		state.configuring = "bedtime";
		ctx.reply('Op welke dagen zal ik je aan je bedtijd herinneren?', Extra.HTML().markup((m) => {
			return m.inlineKeyboard(mainItem(m, state.weekDays, state.currentDays))
		}))
	},
	(ctx) => {
		ctx.reply('Hoe laat staat je wekker in de ochtend?', Extra.markup(Markup.removeKeyboard()));
		return next(ctx, false);
	},
	(ctx) => {
		const re = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!re.test(ctx.message.text)) {
      ctx.reply("Geef een tijdstip op, in de vorm uu:mm")
			return back(ctx, true);
    }
		state.alarm = ctx.message.text;
		return next(ctx, true)
	},
	(ctx) => {
		state.currentDays = state.selectedAlarmDays;
		state.configuring = "alarm";
		ctx.reply('Op welke dagen staat je wekker aan?', Extra.HTML().markup((m) => {
			// console.log(mainItem(m, ["ma", "di", "wo", "do", "vr"], buttonState));
			return m.inlineKeyboard(mainItem(m, state.weekDays, state.currentDays))
		}))
	},
	async (ctx) => {
		if (!state.configured) {
			return;
		}
		ctx.reply('Oké, alles staat klaar! 🚀')
		await ctx.reply('Als je deze instelling later nog een keer wil aanpassen stuur dan /configure')
    ctx.scene.leave()
	}
);

setup.command('quit', async (ctx) => {
  ctx.reply("OK bye");
  await ctx.replyWithAnimation('CgACAgQAAxkBAAIEtF7Xga7XQFt9AnV4-LCrKOajUmXEAAJEAgACDS7tUtP6lOwiewtpGgQ')
	// TODO: await confirmation (or do this in another scene?)
	// TODO: invalidate timers
	state.bedtimeTask.destroy();
	state.alarmTask.destroy();
})

setup.action(/item-([1-7])/, (ctx) => {
  const index = (ctx.match && ctx.match[1]) - 1
  state.currentDays[index] = Number(!state.currentDays[index])
  ctx.editMessageText('Wanneer wil je een herinnering?', Extra.HTML().markup((m) => {
    return m.inlineKeyboard(mainItem(m, state.weekDays, state.currentDays));
  }))
})

setup.action('done', async (ctx) => {
  console.log("done")
  const selected = state.weekDays.filter((button, i) => {
    if (state.currentDays[i] != 0) return button
  });
  if (selected.length > 0) {
    let days = selected.map((d, i) =>
    `${d}`).join(', ');
    await ctx.reply(`Staat genoteerd voor ${days}!`)

		let time = state.configuring === "bedtime" ? state.bedtime : state.alarm;

		let hour = time.split(':')[0];
		let minutes = time.split(':')[1];
		if (state.configuring === "bedtime") {
			minutes -= state.bedtimeNotification;
			if (minutes < 0) {
				minutes = 60 + minutes;
				hour--;
			}
		}
		days = selected.map((d) => {
			let i = state.weekDays.findIndex(x => x === d)
			return `${i+1}`;
		}).join(',');

		console.log(`0 ${minutes} ${hour} * * ${days}`);
		if (state.configuring === "bedtime") {
			state.selectedDays = currentDays;
			if (state.bedtimeTask) state.bedtimeTask.destroy();
			state.bedtimeTask = cron.schedule(`0 ${minutes} ${hour} * * ${days}`, () => {
				bot.telegram.sendMessage(state.chatID, "Het is tijd!");
			});
		} else {
			state.selectedAlarmDays = currentDays;
			if (state.alarmTask) state.alarmTask.destroy();
			state.alarmTask = cron.schedule(`0 ${minutes} ${hour} * * ${days}`, () => {
				bot.telegram.sendMessage(state.chatID, "Tijd om op te staan!");
			});
		}

    // TODO: store data?
		if (state.configuring === "alarm") state.configured = true;
		next(ctx, true);
  } else {
    ctx.reply('Je hebt geen dagen geselecteerd, as je mij wilt uitzetten gebruik dan /quit');
  }
})


function mainItem (m, buttons, s, bedtime) {
  const b = buttons.map((button, i) => (
    m.callbackButton(`${button} ${s[i] ? '✓' : ''}`, `item-${i + 1}`)
  ))
	let d = [m.callbackButton('klaar', 'done')];
	if (bedtime) {
		d = [m.callbackButton('klaar', 'done-alarm')];
	}
  return [b, d];
}

const reminding = new Scene('reminding')
reminding.enter((ctx) => ctx.reply('Time for bed!'))
reminding.leave((ctx) => ctx.reply('exiting echo scene'))
reminding.command('back', leave())
reminding.on('text', (ctx) => ctx.reply(ctx.message.text))
reminding.on('message', (ctx) => ctx.reply('Only text messages please'))

const bot = new Telegraf(process.env.BOT_TOKEN)

const stage = new Stage([authenticate, setup, reminding])
bot.use(session())
bot.use(stage.middleware())
bot.command('/configure', '/setup', '/configureer', (ctx) => {
	ctx.scene.enter('setup');
})
bot.command('/start', async (ctx) => {
	// ctx.reply("Hi there! I'm a bot that will help you take charge of your bedtime routines! Are you ready to embark on a journey?")
	// await ctx.replyWithAnimation('CgACAgQAAxkBAAICZV7VE_ZiduYntjIP8pVmS8XRoWFBAAL5AQAC07OsUktiyspJZF1CGQQ')
  ctx.scene.enter('authenticate') // TODO: Switch to authenticate
})


bot.on("message", (ctx) => {
	console.log(ctx)
})




bot.launch()







// stepHandler.command('next', (ctx) => {
// ctx.reply('Step 2. Via command')
// ctx.wizard.next();
// return ctx.wizard.steps[ctx.wizard.cursor](ctx);
// })
// stepHandler.use((ctx) => ctx.replyWithMarkdown('Press `Next` button or type /next'))
//
// const superWizard = new WizardScene('super-wizard',
// (ctx) => {
//     ctx.reply('Step 1', Markup.inlineKeyboard([
//     Markup.urlButton('❤️', 'http://telegraf.js.org'),
//     Markup.callbackButton('➡️ Next', 'next')
//     ]).extra())
//     return ctx.wizard.next()
// },
// stepHandler,
// (ctx) => {
//     ctx.reply('Step 3')
//     return ctx.wizard.next()
// },
// (ctx) => {
//     ctx.reply('Step 4')
//     return ctx.wizard.next()
// },
// (ctx) => {
//     ctx.reply('Done')
//     return ctx.scene.leave()
// }
// )

// const bot = new Telegraf(process.env.BOT_TOKEN)
// const stage = new Stage([superWizard], { default: 'super-wizard' })
// bot.use(session())
// bot.use(stage.middleware())
// bot.launch()




state.task = cron.schedule('1 * * * * *', () => {
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
	// task.destroy()
}, {
	scheduled: false
});




// OR
// function scheduler (fido) {
//   cron.schedule('*/1 * * * *', () => {
//     try {
//       doStuff(fido);
//     } catch (error) {
//       console.log('error', error);
//     }
//   });
//   console.log(`Scheduler 2 activated: ${new Date()}`);
// }








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

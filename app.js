const dotenv = require('dotenv').config();


const { Telegraf, Context } = require('telegraf')
const { PushContext } = require('./PushContext.js')
const LocalSession = require('telegraf-session-local')
const session = require('telegraf/session')
const Composer = require('telegraf/composer')
const { Extra, Markup } = require('telegraf')
const Stage = require('telegraf/stage')
const Scene = require('telegraf/scenes/base')
const WizardScene = require('telegraf/scenes/wizard');
const Keyboard = require('telegraf-keyboard');
const cron = require('node-cron');
const os = require('os');
const homedir = os.homedir();

const property = 'session'

const localSession = new LocalSession({
  // Database name/path, where sessions will be located (default: 'sessions.json')
  database: homedir + '/bot_db.json',
  // Name of session property object in Telegraf Context (default: 'session')
  property: 'session',
  // Type of lowdb storage (default: 'storageFileSync')
  storage: LocalSession.storageFileAsync,
  // Format of storage/database (default: JSON.stringify / JSON.parse)
  format: {
    serialize: (obj) => JSON.stringify(obj, null, 2), // null & 2 for pretty-formatted JSON
    deserialize: (str) => JSON.parse(str),
  },
  // We will use `messages` array in our database to store user messages using exported lowdb instance from LocalSession via Telegraf Context
  state: {
		selectedDays: [0, 0, 0, 0, 0, 0, 0],
		selectedAlarmDays: [0, 0, 0, 0, 0, 0, 0],
  	weekDays: ["ma", "di", "wo", "do", "vr", "za", "zo"]
	}
})

// localSession.DB.then(DB => {
//   // Database now initialized, so now you can retrieve anything you want from it
//   // console.log('Current LocalSession DB:', DB.value())
//   // console.log(DB.get('sessions').getById('1:1').value())
// 	// console.log(DB.value())
//   // console.log(bot)
//   // console.log(DB.get('sessions').value()[0])
// })



// Handler factoriess
const {
	enter,
	leave
} = Stage

const state = {

}





//
// SCENE SETUP
//

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
		ctx[property].chatID = ctx.message.chat.id;
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
		ctx[property].name = ctx.message.text;
		await ctx.reply(`Hi ${ctx[property].name}!`);
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

const selectStep = (ctx, i) => {
	ctx.wizard.selectStep(i)
	return ctx.wizard.steps[ctx.wizard.cursor](ctx)
}

function randomItem(items)
{
  return items[Math.floor(Math.random()*items.length)];
}

const setup = new WizardScene(
	'setup', // first argument is Scene_ID, same as for BaseScene
	async (ctx) => {
		ctx[property].configured = false;
		ctx[property].chatID = ctx.message.chat.id;
		await ctx.reply('Laten we beginnen met configuren.')
		await ctx.reply('Wetenschappelijk onderzoek heeft aangetoond dat op regelmatige tijden naar bed gaan en opstaan werkt om beter te slapen.')
		ctx.reply('Hoe laat wil je iedere dag in bed liggen om te slapen?', Extra.markup(Markup.removeKeyboard()));
		return next(ctx, false);
	},
	(ctx) => {
		const re = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!re.test(ctx.message.text)) {
      ctx.reply("Geef een tijdstip op, in de vorm uu:mm")
			console.log("wrong date");
    }
		ctx[property + 'DB'].set('bedtime', ctx.message.text).write();;
		return next(ctx, true)
	},
  async (ctx) => {
		ctx.wizard.state.keyboard = new Keyboard()
  		.add('5 min', '10 min', '20 min')
  		.add('30 min', '45 min', '60 min')

		if (ctx[property + 'DB'].get('bedtime').value().slice(':')[0] < 10) {
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
		// console.log(ctx.message.text);
    let time = ctx.message.text.replace(/[^0-9]/g)
    console.log(time);
		if (parseInt(time) <= 0) {
			ctx.reply("Geef het aantal minuten op als een getal.")
			return back(ctx, true);
		}
    ctx[property + 'DB'].set('bedtimeNotification', parseInt(time)).write();
		// console.log(ctx.wizard.state.keyboard)
		if (ctx.wizard.state.keyboard.clear) await ctx.reply("Staat genoteerd!", ctx.wizard.state.keyboard.clear()); //Extra.markup(Markup.removeKeyboard()));
		// console.log(ctx[property].bedtimeNotification)
		return next(ctx, true)
  },
	async (ctx) => {
		ctx[property].currentDays = await ctx[property + 'DB'].get('selectedDays').value();
		ctx[property].weekDays = await ctx[property + 'DB'].get('weekDays').value();
		// console.log(ctx[property].currentDays);
		ctx[property].configuring = "bedtime";
		ctx.reply('Op welke dagen zal ik je aan je bedtijd herinneren?', Extra.HTML().markup((m) => {
			return m.inlineKeyboard(mainItem(m, ctx[property].weekDays, ctx[property].currentDays))
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
		ctx[property + 'DB'].set('alarm', ctx.message.text).write();
		return next(ctx, true)
	},
	async (ctx) => {
		ctx[property].currentDays = await ctx[property + 'DB'].get('selectedAlarmDays').value();
		ctx[property].configuring = "alarm";
		ctx.reply('Op welke dagen staat je wekker aan?', Extra.HTML().markup((m) => {
			// console.log(mainItem(m, ["ma", "di", "wo", "do", "vr"], buttonState));
			return m.inlineKeyboard(mainItem(m, ctx[property].weekDays, ctx[property].currentDays))
		}))
	},
	async (ctx) => {
		if (!ctx[property].configured) {
			return;
		}
		ctx.reply('Oké, alles staat klaar! 🚀')
		await ctx.reply('Als je deze instelling later nog een keer wil aanpassen stuur dan /configure')
    ctx.scene.enter('idle')
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
  ctx[property].currentDays[index] = Number(!ctx[property].currentDays[index])
	// console.log(ctx[property].weekDays);
	// console.log(ctx[property].currentDays);
  ctx.editMessageText('Wanneer wil je een herinnering?', Extra.HTML().markup((m) => {
    return m.inlineKeyboard(mainItem(m, ctx[property].weekDays, ctx[property].currentDays));
  }))
})

setup.action('done', async (ctx) => {
  // console.log("done")
  const selected = ctx[property].weekDays.filter((button, i) => {
    if (ctx[property].currentDays[i] != 0) return button
  });
  if (selected.length > 0) {
    let days = selected.map((d, i) =>
    `${d}`).join(', ');
    await ctx.reply(`Staat genoteerd voor ${days}!`)

		let time = ctx[property].configuring === "bedtime" ? ctx[property + 'DB'].get('bedtime').value() : ctx[property + 'DB'].get('alarm').value();

		let hour = time.split(':')[0];
		let minutes = time.split(':')[1];
		if (ctx[property].configuring === "bedtime") {
			minutes -= ctx[property + 'DB'].get('bedtimeNotification').value();
			if (minutes < 0) {
				minutes = 60 + minutes;
				hour--;
			}
		}
		days = selected.map((d) => {
			let i = ctx[property].weekDays.findIndex(x => x === d)
			return `${i+1}`;
		}).join(',');

		console.log(`0 ${minutes} ${hour} * * ${days}`);
		if (ctx[property].configuring === "bedtime") {
			ctx[property + 'DB'].set('selectedDays', ctx[property].currentDays).write();
			if (state.bedtimeTask) state.bedtimeTask.destroy();
			state.bedtimeTask = cron.schedule(`0 ${minutes} ${hour} * * ${days}`, () => {
				// bot.telegram.sendMessage(ctx[property].chatID, "Het is tijd!");
				ctx.scene.enter('reminding')
			});
		} else {
			ctx[property + 'DB'].set('selectedAlarmDays', ctx[property].currentDays).write();
			if (state.alarmTask) state.alarmTask.destroy();
			state.alarmTask = cron.schedule(`0 ${minutes} ${hour} * * ${days}`, () => {
				// bot.telegram.sendMessage(ctx[property].chatID, "Tijd om op te staan!");
				ctx.scene.enter('wakeup')
			});
		}

		if (ctx[property].configuring === "alarm") ctx[property].configured = true;
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

const reminding = new WizardScene('reminding',
	(ctx) => {
		localSession.saveSession(localSession.getSessionKey(ctx), ctx[property])
		ctx.reply(randomItem([
			'Tijd om je bed op te zoeken!',
			'Hoogste tijd om naar bed te gaan',
			'Het is weer tijd om te gaan slapen!',
			'Het is alweer zover, tijd om naar bed te gaan!'
		]))
		next(ctx, true);

		if (state.reminderTask) state.reminderTask.destroy();
		scheduleReminder(ctx);
		let time = ctx[property + 'DB'].get('bedtime').value();

		let hour = time.split(':')[0];
		let minutes = time.split(':')[1];
		state.bedtimeAlarm = cron.schedule(`* ${minutes} ${hour} * * *`, () => {
			selectStep(ctx, 5)
		});
	},
	(ctx) => {
		return
	},
	(ctx) => {
		ctx.wizard.state.keyboard = new Keyboard()
  		.add('Ja! 🛌')
  		.add('Nee geef me nog eventjes. ⏳')

		ctx.reply(randomItem([
			'Lig je er al in?',
			'Ben je al weer in je bed te vinden?',
			'Al in je bed gekropen?',
			'Ben je al in bed?',
		]), ctx.wizard.state.keyboard.draw())
		state.reminderTask.stop()
		return next(ctx, false);
	},
	(ctx) => {
		if (/Ja/i.test(ctx.message.text)) {
			return selectStep(ctx, 4)
		} else if (/Nee/i.test(ctx.message.text)) {
			selectStep(ctx, 1)
			scheduleReminder(ctx);
			return;
		}
	},
	async (ctx) => {
		await ctx.reply('Tijd om nog even tot rust te komen voordat je gaat slapen!')
		ctx.reply(randomItem(['Lees bijvoorbeeld nog eens een stukje uit een boek 📚.',
			'Luister eens naar een luisterboek 🎶📚.',
			'Probeer eens alleen maar te focusen op hoe je in en uit ademt.',
			'Zet eens op een rijtje wat je vandaag eigenlijk bereikt hebt 📝.',
			'Doe eens een rustig muziekje aan om je gedachtes bij te overdenken🎶.'
		]))
	},
	async (ctx) => {
		await ctx.reply(randomItem([
			'Tijd om die telefoon weg te leggen!',
			'Tijd om het bed in te duiken!',
			'Zet die do not disturb modus maar aan!',
			'Tijd om dag te zeggen!']));
		await ctx.replyWithAnimation('CgACAgQAAxkBAAIN2l7Y8wsjbXAqsjHCqUbgr_Q-eSQ5AAJWAgACDIakUsYgTfEFKE5cGgQ')
		ctx.reply(randomItem([
			'Slaap lekker!',
			'Goedenacht!',
			'Welterusten!'
		]), ctx.wizard.state.keyboard.clear())
		ctx.scene.enter('idle');
		state.reminderTask.destroy();
		state.bedtimeAlarm.destroy();
	}
)

const scheduleReminder = (ctx) => {
	state.reminderTask = cron.schedule(`1 */3 * * * *`, () => {
		next(ctx, true);
	});
}

const wakeup = new WizardScene('wakeup',
	(ctx) => {
		localSession.saveSession(localSession.getSessionKey(ctx), ctx[property])
		ctx.reply(randomItem([
			'Rise and shine!!',
			'Goedemorgen!',
			'Goedemorgen! Klaar voor een mooie nieuwe dag?',
			'Carpe diem!',
			'Daar zijn we weer, goeiemorgen!'
		]))
		next(ctx, true);

		if (state.reminderTask) state.reminderTask.destroy();
		scheduleReminder(ctx);
	},
	(ctx) => {
		return
	},
	(ctx) => {
		ctx.wizard.state.keyboard = new Keyboard()
  		.add('Ja! 🌅')
  		.add('Nee, ik lig er nog in... ⏳')

		ctx.reply(randomItem([
			'Ondertussen al weer je bed uit?',
			'Ben je al met frisse tegenzin aan de dag begonnen?',
			'Zijn we dat bed al weer een keertje uit?',
			'Al weer aan de dag begonnen?'
		]), ctx.wizard.state.keyboard.draw())
		state.reminderTask.stop()
		return next(ctx, false);
	},
	(ctx) => {
		if (/Ja/i.test(ctx.message.text)) {
			return selectStep(ctx, 5)
		} else if (/Nee/i.test(ctx.message.text)) {
			selectStep(ctx, 1)
			scheduleReminder(ctx);
			return;
		}
	},
	(ctx) => {

	},
	(ctx) => {
		ctx.reply('Fijne dag vandaag!', ctx.wizard.state.keyboard.clear())
		ctx.scene.enter('idle');
		state.reminderTask.destroy();
	}
)

const wakeupReminder = (ctx) => {
	state.reminderTask = cron.schedule(`0 * * * * *`, () => {
		next(ctx, true);
	});
}

const idle = new Scene('idle')
idle.enter((ctx) => {
	localSession.saveSession(localSession.getSessionKey(ctx), ctx[property])
	ctx.reply('Over en uit voor nu 💤')
})
idle.command('configure', (ctx) => {
	ctx.scene.enter('setup');
})

const bot = new Telegraf(process.env.BOT_TOKEN, { contextType: PushContext })

const stage = new Stage([authenticate, setup, idle, reminding, wakeup])

bot.use(async (ctx, next) => {
	if (ctx.message) await ctx.addPoint(ctx.message.text, 'user');
	next()
})

bot.use(localSession.middleware(property))
// bot.use(session())
bot.use(stage.middleware())

bot.command('/configure', (ctx) => {
	ctx.scene.enter('setup');
})
bot.command('/start', async (ctx) => {
	ctx.reply("Hallo daar! Klaar om je bedtijdroutine onder controle te krijgen?")
	await ctx.replyWithAnimation('CgACAgQAAxkBAAICZV7VE_ZiduYntjIP8pVmS8XRoWFBAAL5AQAC07OsUktiyspJZF1CGQQ')
	ctx.scene.enter('authenticate') // TODO: Switch to authenticate
})

bot.catch((err, ctx) => {
  console.log(`Error for ${ctx.updateType}`, err)
})

bot.launch()



Stage.enter('authenticate')

// const task = cron.schedule(`0 56 10 * * *`, () => {
//   // bot.telegram.sendMessage(ctx[property].chatID, "Tijd om op te staan!");
//   console.log(stage)
// });

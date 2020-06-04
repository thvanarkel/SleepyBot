const Telegraf = require('telegraf')
const { Context } = Telegraf
const dotenv = require('dotenv').config();
const {
	InfluxDB,
	Point,
	FluxTableMetaData
} = require('@influxdata/influxdb-client');
const cron = require('node-cron');
const os = require('os');

class PushContext extends Context {
  constructor (update, telegram, options) {
    // Extract custom options if needed
    super (update, telegram, options)
    this.dbClient = new InfluxDB({
    	url: process.env.HOST,
    	token: process.env.TOKEN
    })
  }

  reply (...args) {
    // Rate-limit logic
		// console.log(args)
    if (args.length > 0) this.addPoint(args[0], "bot")

    return super.reply(...args)
  }

  addPoint (msg, sender) {
    const t = String(new Date().getTime());
    const point = new Point('message')
      .tag('thing', 'chatbot')
      .tag('sender', sender)
      .intField('sender', sender === 'bot' ? 0 : 1)
      .stringField('value', msg)
      .timestamp(t)
    this.dbClient = new InfluxDB({
    	url: process.env.HOST,
    	token: process.env.TOKEN
    })
		const writeApi = this.dbClient.getWriteApi(process.env.ORG, process.env.BUCKET, 'ms')

		writeApi.useDefaultTags({
			location: os.hostname()
		})
    writeApi.writePoint(point)
		writeApi.close()
    .then(() => {
      console.log(`${point}`)
      console.log("wrote point")
    })
    .catch(e => {
      console.log(e)
    })
  }
}

exports.PushContext = PushContext

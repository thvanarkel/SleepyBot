const botgram = require("botgram")
const bot = botgram("1095782983:AAFw5ojhwHt6YyQK-Y93vEJ9bPT2DLLq71A")

console.log("Started")

bot.command("start", "help", (msg, reply) =>
  reply.text("To schedule an alert, do: /alert <seconds> <text>"))

bot.command("alert", (msg, reply, next) => {
  var [ seconds, text ] = msg.args(2)
  if (!seconds.match(/^\d+$/) || !text) return next()

  setTimeout(() => reply.text(text), Number(seconds) * 1000)
})

bot.text(function (msg, reply, next) {
  console.log("Received a text message:", msg.text);
  reply.text("hello!");
  reply.markdown("Here's some _good_ sticker:");
  reply.sticker("BQADAgAD3gAD9HsZAAFphGBFqImfGAI");
});

bot.command((msg, reply) =>
  reply.text("Invalid command."))

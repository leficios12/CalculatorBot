const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  EmbedBuilder, 
  InteractionType 
} = require("discord.js");
require("dotenv").config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Send button message once on ready
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  const channel = await client.channels.fetch("1407292472006283365"); // replace with your channel ID

  const button = new ButtonBuilder()
    .setCustomId("levelCalcButton")
    .setLabel("Calculate Level")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);

  await channel.send({ content: "# Click the button to calculate XP:", components: [row] });
});

// Full calculation with packs
function calculatePacks(startLevel, targetLevel, currentXP = 0, useDoge = true) {
  let totalXp = 0;
  for (let lvl = startLevel; lvl < targetLevel; lvl++) {
    totalXp += 50 * (Math.pow(lvl, 2) + 2);
  }
  totalXp -= currentXP;
  if (totalXp < 0) totalXp = 0;

  let totalAmt = totalXp;
  let Dirtcoin = 0, Sethcoin = 0, WLcoin = 0, Bitcoin = 0, Dogecoin = 0;

  if (useDoge && totalAmt >= 2000000) {
    Dogecoin += Math.floor(totalAmt / 2000000);
    totalAmt %= 2000000;
  }
  if (totalAmt >= 1000000) {
    Bitcoin += Math.floor(totalAmt / 1000000);
    totalAmt %= 1000000;
  }
  if (totalAmt >= 500000) {
    WLcoin += Math.floor(totalAmt / 500000);
    totalAmt %= 500000;
  }
  if (totalAmt >= 250000) {
    Sethcoin += Math.floor(totalAmt / 250000);
    totalAmt %= 250000;
  }
  if (totalAmt >= 125500) {
    Dirtcoin += Math.floor(totalAmt / 125500);
    totalAmt %= 125500;
  }
  if (totalAmt !== 0) Dirtcoin++;

  if (Dirtcoin >= 2) { Dirtcoin = 0; Sethcoin++; }
  if (Sethcoin >= 2) { Sethcoin = 0; WLcoin++; }
  if (WLcoin >= 2) { WLcoin = 0; Bitcoin++; }
  if (useDoge && Bitcoin >= 2) { Bitcoin = 0; Dogecoin++; }

  let cost = (Dogecoin * 2600) + (Bitcoin * 850) + (WLcoin * 400) + (Sethcoin * 300) + (Dirtcoin * 200);

  return {
    txp: totalXp,
    doge_pack: Dogecoin,
    bit_pack: Bitcoin,
    wl_pack: WLcoin,
    seth_pack: Sethcoin,
    dirt_pack: Dirtcoin,
    cost_total: `${Math.floor(cost / 10000)} BGL(s) ${Math.floor(cost / 100 % 100)} DLs ${cost % 100} WLs`
  };
}

// Interaction handling
client.on("interactionCreate", async interaction => {
  if (interaction.isButton() && interaction.customId === "levelCalcButton") {
    const modal = new ModalBuilder()
      .setCustomId("levelCalcModal")
      .setTitle("Level Calculator");

    const currentLvlInput = new TextInputBuilder()
      .setCustomId("currentLvl")
      .setLabel("Current Level")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const currentXPInput = new TextInputBuilder()
      .setCustomId("currentXP")
      .setLabel("Current XP (optional)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const targetLvlInput = new TextInputBuilder()
      .setCustomId("targetLvl")
      .setLabel("Target Level")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(currentLvlInput),
      new ActionRowBuilder().addComponents(currentXPInput),
      new ActionRowBuilder().addComponents(targetLvlInput)
    );

    await interaction.showModal(modal);
  }

if (interaction.type === InteractionType.ModalSubmit && interaction.customId === "levelCalcModal") {
  const currentLvl = parseInt(interaction.fields.getTextInputValue("currentLvl"));
  const currentXP = parseInt(interaction.fields.getTextInputValue("currentXP") || "0");
  const targetLvl = parseInt(interaction.fields.getTextInputValue("targetLvl"));

  // Validate current level
  if (isNaN(currentLvl) || currentLvl < 1) {
    return interaction.reply({
      content: "⚠️ Current Level must be a valid number (minimum 1).",
      ephemeral: true
    });
  }

  // Validate target level
  if (isNaN(targetLvl) || targetLvl < 1 || targetLvl > 125) {
    return interaction.reply({
      content: "⚠️ Target Level must be between **1 and 125**.",
      ephemeral: true
    });
  }

  // Ensure target is higher than current
  if (targetLvl <= currentLvl) {
    return interaction.reply({
      content: "⚠️ Target Level must be higher than your Current Level.",
      ephemeral: true
    });
  }

  // Validate current XP (no negative)
  if (isNaN(currentXP) || currentXP < 0) {
    return interaction.reply({
      content: "⚠️ Current XP must be a valid non-negative number.",
      ephemeral: true
    });
  }

  // Two calculations
  const slowResult = calculatePacks(currentLvl, targetLvl, currentXP, false); // no Prime
  const fastResult = calculatePacks(currentLvl, targetLvl, currentXP, true);  // with Prime

  // Time per pack (minutes)
  const TIME_DIRT = 5;
  const TIME_SETH = 10;
  const TIME_WL = 15;
  const TIME_BIT = 30;
  const TIME_DOGE = 30;

  // Function to calculate approximate time
function calcTime(result) {
  let minutes = 
    (result.dirt_pack * 5) +
    (result.seth_pack * 10) +
    (result.wl_pack * 15) +
    (result.bit_pack * 30) +
    (result.doge_pack * 30);

  if (minutes < 30) {
    return `~${minutes} minutes`;
  } else if (minutes === 30) {
    return "~30 minutes";
  } else {
    let hours = Math.ceil(minutes / 60);
    return `~${hours} hour${hours > 1 ? "s" : ""}`;
  }
}

  const embed = new EmbedBuilder()
    .setTitle("📊 Level Calculation Result")
    .setColor(0x00AE86)
    .addFields(
      { name: "XP Needed", value: `${slowResult.txp.toLocaleString()} XP`, inline: false },

      // Slow Method
      { name: "🐢 Slow Method", value:
        `**Bit Coin Packs:** ${slowResult.bit_pack}\n` +
        `**WL Coin Packs:** ${slowResult.wl_pack}\n` +
        `**Seth Coin Packs:** ${slowResult.seth_pack}\n` +
        `**Dirt Coin Packs:** ${slowResult.dirt_pack}\n\n` +
        `**Cost:** ${slowResult.cost_total}\n` +
        `**Time Needed:** ${calcTime(slowResult)}`,
        inline: false },

      // Fast Method
      { name: "⚡ Fast Method (With BBE)", value:
        `**Doge Coin Packs:** ${fastResult.doge_pack}\n` +
        `**Bit Coin Packs:** ${fastResult.bit_pack}\n` +
        `**WL Coin Packs:** ${fastResult.wl_pack}\n` +
        `**Seth Coin Packs:** ${fastResult.seth_pack}\n` +
        `**Dirt Coin Packs:** ${fastResult.dirt_pack}\n\n` +
        `**Cost:** ${fastResult.cost_total}\n` +
        `**Time Needed:** ${calcTime(fastResult)}`,
        inline: false }
    )
    .setFooter({ text: "Slow = Cheaper but longer, \nFast = Faster but costs more." });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
});

client.login(process.env.TOKEN);

// test-stream.js
import { Telegraf } from 'telegraf'
import 'dotenv/config'
import fs from 'fs'
import path from 'path'

const token = process.env.BOT_TOKEN
const channelId = process.env.CHANNEL_ID

if (!token || !channelId) {
    console.error('❌ Нет токена или channelId')
    process.exit(1)
}

const bot = new Telegraf(token)

bot.command('test', async (ctx) => {
    console.log('📸 ТЕСТ СО STREAM')
    
    try {
        const imagePath = path.join(process.cwd(), 'assets', 'stream-preview.jpg')
        console.log('1. Путь:', imagePath)
        
        // Создаем поток чтения (читает по кусочкам)
        const stream = fs.createReadStream(imagePath)
        
        console.log('2. Поток создан, отправляем...')
        
        await ctx.telegram.sendPhoto(channelId, { source: stream })
        
        console.log('3. ГОТОВО!')
        await ctx.reply('✅ Фото отправлено через stream!')
        
    } catch (error) {
        console.error('❌ ОШИБКА:', error)
        await ctx.reply('❌ ' + error.message)
    }
})

bot.launch()
    .then(() => console.log('🤖 Тестовый бот запущен!'))
    .catch(console.error)
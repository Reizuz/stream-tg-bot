// test-tiny.js
import { Telegraf } from 'telegraf'
import 'dotenv/config'

const token = process.env.BOT_TOKEN
const channelId = process.env.CHANNEL_ID

if (!token || !channelId) {
    console.error('❌ Нет токена или channelId')
    process.exit(1)
}

const bot = new Telegraf(token)

bot.command('test', async (ctx) => {
    console.log('📸 ТЕСТ С МАЛЕНЬКОЙ КАРТИНКОЙ')
    
    try {
        // Создаем крошечную картинку (1x1 прозрачный пиксель в PNG)
        const tinyPNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
        
        console.log('1. Размер:', tinyPNG.length, 'байт')
        console.log('2. Отправляем...')
        
        await ctx.telegram.sendPhoto(channelId, { source: tinyPNG })
        
        console.log('3. ГОТОВО!')
        await ctx.reply('✅ Маленькое фото отправлено!')
        
    } catch (error) {
        console.error('❌ ОШИБКА:', error)
        await ctx.reply('❌ ' + error.message)
    }
})

bot.launch()
    .then(() => {
        console.log('🤖 Тестовый бот запущен!')
        console.log('📢 Отправь /test')
    })
    .catch(console.error)

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
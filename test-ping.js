// test-ping.js
import https from 'https'

console.log('🔍 Проверка соединения с Telegram...')

const start = Date.now()

const req = https.get('https://api.telegram.org', (res) => {
    const time = Date.now() - start
    console.log(`✅ Соединение есть! Ответ за ${time}ms`)
    console.log('Статус:', res.statusCode)
})

req.on('error', (error) => {
    console.error('❌ Ошибка соединения:', error.message)
})

req.setTimeout(5000, () => {
    console.error('❌ Таймаут соединения')
    req.destroy()
})
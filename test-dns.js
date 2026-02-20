// test-dns.js
import dns from 'dns'

console.log('🔍 Проверка DNS...')

dns.lookup('api.telegram.org', (err, address, family) => {
    if (err) {
        console.error('❌ Ошибка DNS:', err)
    } else {
        console.log('✅ IP адрес api.telegram.org:', address)
    }
})

dns.resolve('api.telegram.org', (err, addresses) => {
    if (err) {
        console.error('❌ Ошибка разрешения:', err)
    } else {
        console.log('✅ Все IP:', addresses)
    }
})
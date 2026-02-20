/* =============================================
   БОТ ДЛЯ АНОНСОВ СТРИМОВ
   Асинхронная версия
   ============================================= */

import 'dotenv/config'
import { Telegraf, Markup } from 'telegraf'
import { socialService } from './modules/socialModule.js'
import TwitchService from './modules/twitchModule.js'
import { imageService } from './modules/moduleImages.js'
import fs from 'fs'           // 👈 Добавляем для работы с файлами
import path from 'path'       // 👈 Добавляем для работы с путями
import { fileURLToPath } from 'url'  // 👈 Добавляем для ES modules
import axios from 'axios'  // 👈 Обязательно добавить!
import cron from 'node-cron'  // 👈 Проверь, что так

// =============================================
// КОНФИГУРАЦИЯ
// =============================================
const config = {
	//Телега
	token: process.env.BOT_TOKEN,
	channelId: process.env.CHANNEL_ID,

	// Twitch
	twitchClientId: process.env.TWITCH_CLIENT_ID,
	twitchClientSecret: process.env.TWITCH_CLIENT_SECRET,
	twitchUsername: process.env.TWITCH_USERNAME,

	//Настройки
	checkInterval: process.env.CHECK_INTERVAL || '1',
	name: 'Reizuz Stream Bot',
	version: '0.0.2'
}

// =============================================
// ПРОВЕРКА КОНФИГУРАЦИИ
// =============================================
function validateConfig() {
	const errors = []

	if (!config.token) errors.push('❌ BOT_TOKEN не найден в .env')
	if (!config.channelId) errors.push('❌ CHANNEL_ID не найден в .env')
	if (!config.twitchClientId) errors.push('❌ TWITCH_CLIENT_ID не найден в .env')
	if (!config.twitchClientSecret) errors.push('❌ TWITCH_CLIENT_SECRET не найден в .env')
	if (!config.twitchUsername) errors.push('❌ TWITCH_USERNAME не найден в .env')

	if (errors.length > 0) {
		errors.forEach(err => console.error(err))
		console.error('\n💡 Проверь файл .env')
		process.exit(1)
	}
}

// =============================================
// ИНИЦИАЛИЗАЦИЯ СЕРВИСОВ
// =============================================
const twitchService = new TwitchService({
	TWITCH_CLIENT_ID: config.twitchClientId,
	TWITCH_CLIENT_SECRET: config.twitchClientSecret,
	TWITCH_USERNAME: config.twitchUsername
})

// =============================================
// ФУНКЦИИ ДЛЯ РАБОТЫ С СООБЩЕНИЯМИ
// =============================================
function createAnnouncementText(streamInfo) {
	const gameText = streamInfo.gameName ? `🎮 Игра: ${streamInfo.gameName}\n` : ''
	const viewersText = streamInfo.viewerCount ? `👁‍🗨 Зрителей: ${streamInfo.viewerCount.toLocaleString()}\n` : ''

	const socialLinks = socialService.createTextLinks()
	const socialBlock = socialLinks ? `\n\n${socialLinks}` : ''

	return `
🔴 *СТРИМ НАЧАЛСЯ!*

*${streamInfo.title}*

${gameText}${viewersText}
Заваривайте чай и залетайте! 👇
    `.trim()
}

function createStreamEndText() {
	const socialLinks = socialService.createTextLinks()
	const socialBlock = socialLinks ? `\n\n${socialLinks}` : ''

	return `
📴 *СТРИМ ЗАКОНЧИЛСЯ*

Спасибо всем, кто был! Записи появятся на YouTube.${socialBlock}
    `.trim()
}

// =============================================
// ИНИЦИАЛИЗАЦИЯ БОТА
// =============================================
function createBot() {
	const bot = new Telegraf(config.token)

	// Middleware для логирования
	bot.use(async (ctx, next) => {
		const start = Date.now()
		await next()
		const ms = Date.now() - start
		console.log(`📨 ${ctx.updateType} обработан за ${ms}ms`)
	})

	return bot
}

// =============================================
// КОМАНДЫ БОТА
// =============================================
function setupCommands(bot) {

	// Добавь в setupCommands() временную команду
	bot.command('debug', async (ctx) => {
		console.log('🔧 Диагностика...')

		// 1. Проверяем состояние в файле
		const saved = twitchService.getStatus()
		await ctx.reply(`📁 *Состояние в файле:*\n` +
			`Статус: ${saved.isLive ? '🔴 ONLINE' : '⭕ OFFLINE'}\n` +
			`Название: ${saved.title || 'нет'}\n` +
			`Последняя проверка: ${saved.lastChecked || 'никогда'}`,
			{ parse_mode: 'Markdown' }
		)

		// 2. Делаем принудительную проверку
		await ctx.reply('🔄 Выполняю принудительную проверку...')
		const streamInfo = await twitchService.forceCheck()

		if (streamInfo && streamInfo.isLive) {
			await ctx.reply(
				`✅ *Реальное состояние:* В ЭФИРЕ\n` +
				`📺 ${streamInfo.title}\n` +
				`🎮 ${streamInfo.gameName}\n` +
				`👁 ${streamInfo.viewerCount} зрителей`,
				{ parse_mode: 'Markdown' }
			)
		} else {
			await ctx.reply('⭕ *Реальное состояние:* Нет в эфире', { parse_mode: 'Markdown' })
		}

		// 3. Показываем обновленное состояние
		const newSaved = twitchService.getStatus()
		await ctx.reply(`📁 *Новое состояние в файле:*\n` +
			`Статус: ${newSaved.isLive ? '🔴 ONLINE' : '⭕ OFFLINE'}\n` +
			`Название: ${newSaved.title || 'нет'}\n` +
			`Последняя проверка: ${newSaved.lastChecked || 'никогда'}`,
			{ parse_mode: 'Markdown' }
		)
	})

	// Команда для тестирования анонса
	bot.command('teststream', async (ctx) => {
		console.log('🧪 Тестовый анонс')

		try {
			const messageText = ctx.message.text
			const args = messageText.split(' ').slice(1).join(' ').trim()
			const testTitle = args || '🔴 ТЕСТОВЫЙ СТРИМ'

			const testStreamInfo = {
				title: testTitle,
				gameName: 'Тестовая игра',
				viewerCount: 1337
			}

			const gameText = testStreamInfo.gameName ? `🎮 Игра: ${testStreamInfo.gameName}\n` : ''
			const viewersText = testStreamInfo.viewerCount ? `👁‍🗨 Зрителей: ${testStreamInfo.viewerCount.toLocaleString()}\n` : ''

			const announcementText =
				`🔴 <b>СТРИМ НАЧАЛСЯ!</b>

<b>${testStreamInfo.title}</b>

${gameText}${viewersText}
Заваривайте чай и залетайте! 👇`

			const keyboard = socialService.createKeyboard()

			// ПОЛУЧАЕМ КАРТИНКУ ИЗ СЕРВИСА (автоматически выберет быстрый способ)
			const image = imageService.getImage()

			if (!image) {
				await ctx.reply('❌ Картинка не найдена')
				return
			}

			console.log('🖼 Отправка фото...')

			await ctx.telegram.sendPhoto(
				config.channelId,
				image,  // 👈 УЖЕ ГОТОВЫЙ ОБЪЕКТ ДЛЯ ОТПРАВКИ
				{
					caption: announcementText,
					parse_mode: 'HTML',
					reply_markup: keyboard?.reply_markup
				}
			)

			console.log('✅ Тестовый анонс отправлен!')
			await ctx.reply('✅ Тестовый анонс отправлен в канал!')

		} catch (error) {
			console.error('❌ Ошибка тестового анонса:', error)
			await ctx.reply('❌ Ошибка: ' + error.message)
		}
	})
	// Команда /start
	bot.start(async (ctx) => {
		await ctx.reply(
			`🎮 *Добро пожаловать!*\n\n` +
			`Я бот для автоматических анонсов стримов.\n` +
			`Отслеживаю Twitch и публикую анонсы в канал.`,
			{ parse_mode: 'Markdown' }
		)
		console.log(`👤 Пользователь ${ctx.from.username} запустил бота`)
	})

	bot.help(async (ctx) => {
		await ctx.reply(
			`📚 *Доступные команды*\n\n` +
			`/start - приветствие\n` +
			`/help - это сообщение\n` +
			`/status - статус бота и стрима (из файла)\n` +  // 👈 ИСПРАВЛЕНО
			`/checktwitch - принудительная проверка Twitch (реальное API)\n` +
			`/resetstream - сброс состояния стрима\n` +
			`/socials - статус соцсетей\n` +
			`/image - статус картинки\n` +
			`/reloadimage - перезагрузить картинку\n` +
			`/test - тест отправки в канал\n` +
			`/teststream [название] - тестовый анонс стрима\n` +
			`/stream [название] - ручной анонс стрима`,
			{ parse_mode: 'Markdown' }
		)
	})

	// Команда /status
	bot.command('status', async (ctx) => {
		const twitch = twitchService.getStatus()  // 👈 ИСПРАВЛЕНО
		const socialStats = socialService.getStats()

		const stream = twitch.isLive
			? `🔴 *В ЭФИРЕ*\n🎮 ${twitch.title}\n🕒 Начало: ${new Date(twitch.startedAt).toLocaleString()}`
			: '⭕ *Офлайн*'

		await ctx.reply(
			`📊 *Статус бота*\n\n` +
			`🤖 Имя: ${config.name}\n` +
			`📦 Версия: ${config.version}\n\n` +
			`📺 *Twitch (@${config.twitchUsername})*\n${stream}\n\n` +
			`📱 *Соцсети*\n` +
			`Статус: ${socialStats.enabled ? '✅' : '❌'}\n` +
			`Кнопок: ${socialStats.buttons}\n\n` +
			`⏱ Проверка: каждые ${config.checkInterval} мин`,
			{ parse_mode: 'Markdown' }
		)
	})

	bot.command('checktwitch', async (ctx) => {
		console.log('🔍 Принудительная проверка Twitch...')
		await ctx.reply('🔄 Проверяю Twitch API...')

		try {
			// Используем forceCheck, который обновляет состояние
			const streamInfo = await twitchService.forceCheck()

			if (!streamInfo) {
				await ctx.reply('❌ Не удалось получить данные от Twitch API')
				return
			}

			if (streamInfo.isLive) {
				await ctx.reply(
					`✅ *Стример @${config.twitchUsername} В ЭФИРЕ!*\n\n` +
					`📺 *Название:* ${streamInfo.title}\n` +
					`🎮 *Игра:* ${streamInfo.gameName || 'не указана'}\n` +
					`👁 *Зрителей:* ${streamInfo.viewerCount.toLocaleString()}\n` +
					`🕒 *Начало:* ${new Date(streamInfo.startedAt).toLocaleString()}`,
					{ parse_mode: 'Markdown' }
				)
			} else {
				await ctx.reply(`⭕ *Стример @${config.twitchUsername} не в эфире*`, { parse_mode: 'Markdown' })
			}

			// Показываем обновленное состояние
			const saved = twitchService.getStatus()
			await ctx.reply(
				`📁 *Сохраненное состояние в файле:*\n` +
				`Статус: ${saved.isLive ? '🔴 ONLINE' : '⭕ OFFLINE'}\n` +
				`Последняя проверка: ${saved.lastChecked || 'никогда'}`,
				{ parse_mode: 'Markdown' }
			)

		} catch (error) {
			console.error('❌ Ошибка при проверке:', error)
			await ctx.reply('❌ Ошибка: ' + error.message)
		}
	})
	// Команда для сброса состояния (если нужно перезапустить отслеживание)
	bot.command('resetstream', async (ctx) => {
		console.log('🔄 Сброс состояния стрима')

		// Сбрасываем состояние в файле
		twitchService.state = {
			lastStreamId: null,
			isLive: false,
			lastChecked: new Date().toISOString(),
			streamTitle: null,
			streamGame: null,
			streamStartedAt: null
		}
		twitchService.saveState()

		await ctx.reply('✅ Состояние стрима сброшено. Будет считаться, что стрим был офлайн.')
	})

	// Команда /socials
	bot.command('socials', async (ctx) => {
		const stats = socialService.getStats()

		await ctx.reply(
			`📱 *Настройки соцсетей*\n\n` +
			`Статус: ${stats.enabled ? '✅ Включены' : '❌ Отключены'}\n` +
			`Рядов: ${stats.rows}\n` +
			`Кнопок: ${stats.buttons}\n` +
			`Описания: ${stats.settings.showDescriptions ? 'показаны' : 'скрыты'}`,
			{ parse_mode: 'Markdown' }
		)
	})

	// Команда /test
	bot.command('test', async (ctx) => {
		const keyboard = socialService.createKeyboard()
		const testMessage = `🔔 *Тестовое сообщение*\n\nБот работает корректно! ✓`

		try {
			await ctx.telegram.sendMessage(
				config.channelId,
				testMessage,
				{
					parse_mode: 'Markdown',
					...(keyboard || {})
				}
			)
			await ctx.reply('✅ Тестовое сообщение отправлено в канал!')
			console.log(`📢 Тест отправлен в канал ${config.channelId}`)
		} catch (error) {
			await ctx.reply('❌ Ошибка отправки: ' + error.message)
			console.error('❌ Ошибка теста:', error.message)
		}
	})

	// Команда /stream (ручной анонс)
	bot.command('stream', async (ctx) => {
		const messageText = ctx.message.text
		const args = messageText.split(' ').slice(1).join(' ').trim()
		const streamTitle = args || '🔴 СТРИМ НАЧАЛСЯ'

		// Создаём объект стрима для ручного анонса
		const streamInfo = {
			title: streamTitle,
			gameName: 'Не указана',
			viewerCount: null
		}

		try {
			const announcementText = createAnnouncementText(streamInfo)
			const keyboard = socialService.createKeyboard()

			await ctx.telegram.sendMessage(
				config.channelId,
				announcementText,
				{
					parse_mode: 'Markdown',
					...(keyboard || {})
				}
			)

			await ctx.reply('✅ Анонс опубликован в канале!')
			console.log(`📢 Ручной анонс: "${streamTitle}"`)

		} catch (error) {
			await ctx.reply('❌ Ошибка при публикации: ' + error.message)
			console.error('❌ Ошибка анонса:', error.message)
		}
	})
}

// =============================================
// ФУНКЦИЯ АВТОМАТИЧЕСКОЙ ПРОВЕРКИ
// =============================================
// =============================================
// ФУНКЦИЯ АВТОМАТИЧЕСКОЙ ПРОВЕРКИ
// =============================================
async function checkStreamAndAnnounce(bot) {
	console.log(`🔍 Проверка Twitch... (${new Date().toLocaleString()})`)

	try {
		const changes = await twitchService.checkForChanges()

		if (!changes.changed) {
			return
		}

		// Получаем клавиатуру
		const keyboard = socialService.createKeyboard()

		// Стрим начался
		if (changes.event === 'stream_started') {
			// Создаём текст анонса
			const announcementText = createAnnouncementText(changes.streamInfo)

			console.log('🎮 Стрим начался:', changes.streamInfo.title)

			// Проверяем наличие оптимизированной картинки
			if (imageService.hasImage()) {
				console.log('🖼 Отправляем анонс с оптимизированной картинкой')

				try {
					await bot.telegram.sendPhoto(
						config.channelId,
						imageService.getImage(), // Используем getImage() вместо getInputFile()
						{
							caption: announcementText,
							parse_mode: 'Markdown',
							reply_markup: keyboard?.reply_markup
						}
					)
					console.log('✅ Анонс с картинкой опубликован!')
				} catch (photoError) {
					console.error('❌ Ошибка отправки с картинкой:', photoError.message)

					// Если не получилось с картинкой, отправляем без неё
					await bot.telegram.sendMessage(
						config.channelId,
						announcementText,
						{
							parse_mode: 'Markdown',
							reply_markup: keyboard?.reply_markup
						}
					)
					console.log('✅ Анонс без картинки опубликован (fallback)')
				}
			} else {
				console.log('⚠️ Картинка не найдена, отправляем текст')

				await bot.telegram.sendMessage(
					config.channelId,
					announcementText,
					{
						parse_mode: 'Markdown',
						reply_markup: keyboard?.reply_markup
					}
				)
				console.log('✅ Анонс без картинки опубликован!')
			}
		}

		// Стрим закончился
		if (changes.event === 'stream_ended') {
			console.log('📴 Стрим закончился')
			const endText = createStreamEndText()

			await bot.telegram.sendMessage(
				config.channelId,
				endText,
				{
					parse_mode: 'Markdown',
					reply_markup: keyboard?.reply_markup
				}
			)
			console.log('📴 Сообщение об окончании отправлено')
		}

		// Стрим обновился (изменилось название)
		if (changes.event === 'stream_updated') {
			console.log(`📝 Название стрима изменилось на: "${changes.streamInfo.title}"`)
			// Можно добавить оповещение об изменении, если нужно
		}

	} catch (error) {
		console.error('❌ Ошибка в автоматической проверке:', error.message)
	}
}
// =============================================
// ЗАПУСК БОТА
// =============================================
// =============================================
// ЗАПУСК БОТА
// =============================================
async function startBot() {
	console.log('\n' + '='.repeat(50))
	console.log('🚀 ЗАПУСК БОТА')
	console.log('='.repeat(50))

	try {
		// Проверяем конфигурацию
		validateConfig()
		console.log('✅ Конфигурация загружена')

		// Информация о соцсетях
		const socialStats = socialService.getStats()
		console.log(`📱 Соцсети: ${socialStats.enabled ? 'включены' : 'отключены'} (${socialStats.buttons} кнопок)`)

		// Информация о картинке
		const imageInfo = imageService.getInfo()
		console.log(`🖼 Картинка: ${imageInfo.hasImage ? '✅ загружена' : '❌ не найдена'} (${imageInfo.size} байт)`)

		// Проверяем Twitch
		console.log(`📺 Twitch: @${config.twitchUsername}`)
		
		// Выполняем первичную проверку Twitch API
		console.log('🔄 Выполняю первичную проверку Twitch API...')
		try {
			const liveStream = await twitchService.checkStream()
			
			if (liveStream && liveStream.isLive) {
				console.log(`🔴 СТРИМ В ЭФИРЕ! Название: ${liveStream.title}`)
				
				// Обновляем состояние в файле
				twitchService.state.isLive = true
				twitchService.state.lastStreamId = liveStream.id
				twitchService.state.streamTitle = liveStream.title
				twitchService.state.streamGame = liveStream.gameName
				twitchService.state.streamStartedAt = liveStream.startedAt
				twitchService.state.lastChecked = new Date().toISOString()
				twitchService.saveState()
				
				console.log('✅ Состояние обновлено (ONLINE)')
			} else {
				console.log('⭕ Стрим не в эфире')
				
				// Обновляем состояние в файле
				twitchService.state.isLive = false
				twitchService.state.lastChecked = new Date().toISOString()
				twitchService.saveState()
			}
		} catch (error) {
			console.error('❌ Ошибка при первичной проверке:', error.message)
		}
		
		// Показываем финальное состояние
		const finalStatus = twitchService.getStatus()
		console.log(`📊 Финальный статус: ${finalStatus.isLive ? '🔴 ONLINE' : '⭕ OFFLINE'}`)
		if (finalStatus.isLive) {
			console.log(`📝 Название: ${finalStatus.title}`)
		}

		// Создаём бота
		const bot = createBot()
		console.log('✅ Бот инициализирован')

		// Настраиваем команды
		setupCommands(bot)
		console.log('✅ Команды загружены')

		// =========================================
		// ЗАПУСК БОТА (С ТАЙМАУТОМ)
		// =========================================
		console.log('🔄 Запускаю бота...')

		try {
			// Добавляем таймаут на запуск
			const launchPromise = bot.launch()
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Таймаут запуска бота (10с)')), 10000)
			})
			
			await Promise.race([launchPromise, timeoutPromise])
			
			console.log('✅ Бот успешно запущен!')
			console.log(`📢 Канал: ${config.channelId}`)
			
		} catch (launchError) {
			console.error('❌ Ошибка запуска бота:', launchError.message)
			console.log('🔄 Пробую альтернативный способ запуска...')
			
			// Альтернативный способ запуска
			try {
				const me = await bot.telegram.getMe()
				console.log(`✅ Соединение с Telegram есть (бот: @${me.username})`)
				
				// Запускаем без ожидания
				bot.launch().catch(e => {
					console.error('❌ Фоновая ошибка:', e.message)
				})
				
				console.log('✅ Бот запущен в фоновом режиме')
				console.log(`📢 Канал: ${config.channelId}`)
				
			} catch (altError) {
				console.error('❌ Альтернативный запуск тоже не работает:', altError.message)
				throw altError
			}
		}
		
		// =========================================
		// ЗАПУСК ПЕРИОДИЧЕСКИХ ПРОВЕРОК
		// =========================================
		console.log('⏰ Настройка автоматических проверок...')

		// Функция для запуска проверок
		function startPeriodicChecks(bot) {
			// Получаем интервал из конфига
			let intervalMinutes = 5; // по умолчанию 5 минут
			
			if (config.checkInterval) {
				const parsed = parseInt(config.checkInterval);
				if (!isNaN(parsed) && parsed > 0) {
					intervalMinutes = parsed;
					console.log(`✅ Интервал из конфига: ${intervalMinutes} мин`);
				} else {
					console.log(`⚠️ Неправильный CHECK_INTERVAL="${config.checkInterval}", использую 5 мин`);
				}
			} else {
				console.log('⚠️ CHECK_INTERVAL не задан, использую 5 мин');
			}
			
			const intervalMs = intervalMinutes * 60 * 1000;
			console.log(`⏰ Будет проверять каждые ${intervalMinutes} мин (${intervalMs} мс)`);
			
			// Первая проверка через 10 секунд
			setTimeout(() => {
				console.log('🔄 Первая автоматическая проверка...');
				checkStreamAndAnnounce(bot).catch(err => {
					console.error('❌ Ошибка в первой проверке:', err.message);
				});
			}, 10000);
			
			// Периодические проверки
			setInterval(() => {
				console.log(`⏰ Автоматическая проверка (интервал ${intervalMinutes} мин)`);
				checkStreamAndAnnounce(bot).catch(err => {
					console.error('❌ Ошибка в проверке:', err.message);
				});
			}, intervalMs);
			
			console.log(`✅ Периодические проверки запущены`);
		}

		// Запускаем проверки
		startPeriodicChecks(bot);
		
		console.log('='.repeat(50) + '\n')

		return bot

	} catch (error) {
		console.error('❌ Критическая ошибка:', error)
		process.exit(1)
	}
}
// =============================================
// ОБРАБОТКА СИГНАЛОВ ЗАВЕРШЕНИЯ
// =============================================
function setupGracefulShutdown(bot) {
	// Корректное завершение при Ctrl+C
	process.once('SIGINT', async () => {
		console.log('\n👋 Получен сигнал SIGINT')
		await bot.stop('SIGINT')
		console.log('👋 Бот остановлен')
		process.exit(0)
	})

	process.once('SIGTERM', async () => {
		console.log('\n👋 Получен сигнал SIGTERM')
		await bot.stop('SIGTERM')
		console.log('👋 Бот остановлен')
		process.exit(0)
	})

	// Обработка необработанных ошибок
	process.on('uncaughtException', async (error) => {
		console.error('❌ Необработанная ошибка:', error)
		if (bot) await bot.stop('uncaughtException')
		process.exit(1)
	})

	process.on('unhandledRejection', async (error) => {
		console.error('❌ Необработанный промис:', error)
		if (bot) await bot.stop('unhandledRejection')
		process.exit(1)
	})
}

// =============================================
// ТОЧКА ВХОДА
// =============================================
try {
	const bot = await startBot()
	setupGracefulShutdown(bot)
} catch (error) {
	console.error('❌ Фатальная ошибка:', error)
	process.exit(1)
}
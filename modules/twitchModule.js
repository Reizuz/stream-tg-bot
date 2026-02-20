import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Файл для хранения состояния стримов
const STATE_FILE = path.join(__dirname, '..', 'stream_state.json')

class TwitchService {
	constructor(config) {
		this.clientId = config.TWITCH_CLIENT_ID
		this.clientSecret = config.TWITCH_CLIENT_SECRET
		this.username = config.TWITCH_USERNAME
		this.userId = null
		this.token = null
		this.tokenExpiresAt = null

		// Загружаем предыдущее состояние
		this.loadState()
	}

	// Загружаем предыдущее состояние
	loadState() {
		try {
			if (fs.existsSync(STATE_FILE)) {
				const data = fs.readFileSync(STATE_FILE, 'utf8')
				this.state = JSON.parse(data)
				console.log('📂 Состояние стримов загружено')
				console.log('📊 Текущий статус:', this.state.isLive ? '🔴 ONLINE' : '⭕ OFFLINE')
				if (this.state.streamTitle) {
					console.log('📝 Последний стрим:', this.state.streamTitle)
				}
			} else {
				console.log('📂 Файл состояния не найден, создаём новый')
				this.state = {
					lastStreamId: null,
					isLive: false,
					lastChecked: null,
					streamTitle: null,
					streamGame: null,
					streamStartedAt: null
				}
				// 👇 ВАЖНО: сразу сохраняем новое состояние
				this.saveState()
			}
		} catch (error) {
			console.error('❌ Ошибка загрузки состояния:', error.message)
			this.state = {
				lastStreamId: null,
				isLive: false,
				lastChecked: null,
				streamTitle: null,
				streamGame: null,
				streamStartedAt: null
			}
			// 👇 ВАЖНО: сохраняем даже при ошибке
			this.saveState()
		}
	}

	// Сохраняем состояние
	saveState() {
		try {
			this.state.lastChecked = new Date().toISOString()
			fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2))
			console.log('💾 Состояние сохранено в файл')
		} catch (error) {
			console.error('❌ Ошибка сохранения состояния:', error.message)
		}
	}

	// Получаем токен
	async getToken() {
		try {
			// Если токен ещё действителен, возвращаем его
			if (this.token && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
				return this.token
			}

			console.log('🔄 Получаем новый токен Twitch...')

			const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
				params: {
					client_id: this.clientId,
					client_secret: this.clientSecret,
					grant_type: 'client_credentials'
				}
			})

			const { access_token, expires_in } = response.data

			// Сохраняем токен (на 10 минут раньше для запаса)
			this.token = access_token
			this.tokenExpiresAt = new Date(Date.now() + (expires_in - 600) * 1000)

			console.log('✅ Токен Twitch получен')
			return this.token

		} catch (error) {
			console.error('❌ Ошибка получения токена:', error.response?.data || error.message)
			return null
		}
	}

	// Получаем ID пользователя
	async getUserId() {
		try {
			if (this.userId) return this.userId

			const token = await this.getToken()
			if (!token) return null

			const response = await axios.get('https://api.twitch.tv/helix/users', {
				headers: {
					'Client-ID': this.clientId,
					'Authorization': `Bearer ${token}`
				},
				params: {
					login: this.username
				}
			})

			if (response.data.data && response.data.data.length > 0) {
				this.userId = response.data.data[0].id
				console.log(`✅ Найден ID пользователя: ${this.userId}`)
				return this.userId
			} else {
				console.log(`❌ Пользователь ${this.username} не найден`)
				return null
			}
		} catch (error) {
			console.error('❌ Ошибка получения ID:', error.response?.data || error.message)
			return null
		}
	}

	// Проверяем стрим
	async checkStream() {
		try {
			const userId = await this.getUserId()
			if (!userId) return null

			const token = await this.getToken()
			if (!token) return null

			const response = await axios.get('https://api.twitch.tv/helix/streams', {
				headers: {
					'Client-ID': this.clientId,
					'Authorization': `Bearer ${token}`
				},
				params: {
					user_id: userId
				}
			})

			// Если есть данные - стрим идёт
			if (response.data.data && response.data.data.length > 0) {
				const stream = response.data.data[0]
				return {
					isLive: true,
					id: stream.id,
					title: stream.title,
					gameName: stream.game_name,
					gameId: stream.game_id,
					viewerCount: stream.viewer_count,
					startedAt: stream.started_at,
					thumbnailUrl: stream.thumbnail_url
						.replace('{width}', '1280')
						.replace('{height}', '720')
				}
			}

			// Стрима нет
			return {
				isLive: false
			}

		} catch (error) {
			console.error('❌ Ошибка проверки стрима:', error.response?.data || error.message)
			return null
		}
	}

	// Проверяем изменения
	async checkForChanges() {
		const streamInfo = await this.checkStream()

		if (!streamInfo) {
			return { changed: false, error: true }
		}

		const wasLive = this.state.isLive
		const isLive = streamInfo.isLive

		// Случай 1: Стрим только что начался
		if (isLive && !wasLive) {
			console.log('🎉 СТРИМ НАЧАЛСЯ!')

			this.state.isLive = true
			this.state.lastStreamId = streamInfo.id
			this.state.streamTitle = streamInfo.title
			this.state.streamGame = streamInfo.gameName
			this.state.streamStartedAt = streamInfo.startedAt
			this.saveState()  // 👈 Сохраняем изменения

			return {
				changed: true,
				event: 'stream_started',
				streamInfo
			}
		}

		// Случай 2: Стрим закончился
		if (!isLive && wasLive) {
			console.log('📴 СТРИМ ЗАКОНЧИЛСЯ')

			this.state.isLive = false
			this.state.streamTitle = null
			this.state.streamGame = null
			this.state.streamStartedAt = null
			this.saveState()  // 👈 Сохраняем изменения

			return {
				changed: true,
				event: 'stream_ended',
				streamInfo
			}
		}

		// Случай 3: Стрим идёт, но изменилось название
		if (isLive && wasLive && streamInfo.title !== this.state.streamTitle) {
			console.log(`📝 Название изменилось: "${this.state.streamTitle}" -> "${streamInfo.title}"`)

			this.state.streamTitle = streamInfo.title
			this.state.streamGame = streamInfo.gameName
			this.saveState()  // 👈 Сохраняем изменения

			return {
				changed: true,
				event: 'stream_updated',
				streamInfo
			}
		}

		// Изменений нет
		return { changed: false }
	}

	// Получаем текущее состояние
	getStatus() {
		return {
			isLive: this.state.isLive,
			title: this.state.streamTitle,
			game: this.state.streamGame,
			startedAt: this.state.streamStartedAt,
			lastChecked: this.state.lastChecked
		}
	}

	// В twitchModule.js, функция checkForChanges()
	async checkForChanges() {
		console.log('🔍 TwitchService: проверяем изменения...')

		const streamInfo = await this.checkStream()

		if (!streamInfo) {
			console.log('❌ TwitchService: не удалось получить данные')
			return { changed: false, error: true }
		}

		const wasLive = this.state.isLive
		const isLive = streamInfo.isLive

		console.log(`📊 TwitchService: было: ${wasLive ? 'ONLINE' : 'OFFLINE'}, стало: ${isLive ? 'ONLINE' : 'OFFLINE'}`)

		// Случай 1: Стрим только что начался
		if (isLive && !wasLive) {
			console.log('🎉 TwitchService: СТРИМ НАЧАЛСЯ!')

			this.state.isLive = true
			this.state.lastStreamId = streamInfo.id
			this.state.streamTitle = streamInfo.title
			this.state.streamGame = streamInfo.gameName
			this.state.streamStartedAt = streamInfo.startedAt
			this.state.lastChecked = new Date().toISOString()
			this.saveState()  // 👈 ОБЯЗАТЕЛЬНО СОХРАНЯЕМ

			console.log('💾 TwitchService: состояние сохранено (ONLINE)')

			return {
				changed: true,
				event: 'stream_started',
				streamInfo
			}
		}

		// Случай 2: Стрим закончился
		if (!isLive && wasLive) {
			console.log('📴 TwitchService: СТРИМ ЗАКОНЧИЛСЯ')

			this.state.isLive = false
			this.state.streamTitle = null
			this.state.streamGame = null
			this.state.streamStartedAt = null
			this.state.lastChecked = new Date().toISOString()
			this.saveState()  // 👈 ОБЯЗАТЕЛЬНО СОХРАНЯЕМ

			console.log('💾 TwitchService: состояние сохранено (OFFLINE)')

			return {
				changed: true,
				event: 'stream_ended',
				streamInfo
			}
		}

		// Случай 3: Стрим идёт, но изменилось название
		if (isLive && wasLive && streamInfo.title !== this.state.streamTitle) {
			console.log(`📝 TwitchService: название изменилось: "${this.state.streamTitle}" -> "${streamInfo.title}"`)

			this.state.streamTitle = streamInfo.title
			this.state.streamGame = streamInfo.gameName
			this.state.lastChecked = new Date().toISOString()
			this.saveState()  // 👈 ОБЯЗАТЕЛЬНО СОХРАНЯЕМ

			console.log('💾 TwitchService: состояние обновлено (новое название)')

			return {
				changed: true,
				event: 'stream_updated',
				streamInfo
			}
		}

		// Случай 4: Стрим идёт, без изменений - просто обновляем время проверки
		if (isLive && wasLive) {
			this.state.lastChecked = new Date().toISOString()
			this.saveState()  // 👈 Сохраняем время проверки
			console.log('💾 TwitchService: время проверки обновлено')
		}

		// Изменений нет
		return { changed: false }
	}
	async forceCheck() {
		console.log('🔄 Принудительная проверка Twitch...')

		const streamInfo = await this.checkStream()

		if (!streamInfo) {
			console.log('❌ Не удалось получить данные')
			return null
		}

		// Обновляем состояние
		this.state.lastChecked = new Date().toISOString()

		if (streamInfo.isLive) {
			this.state.isLive = true
			this.state.lastStreamId = streamInfo.id
			this.state.streamTitle = streamInfo.title
			this.state.streamGame = streamInfo.gameName
			this.state.streamStartedAt = streamInfo.startedAt
		} else {
			this.state.isLive = false
		}

		this.saveState()
		console.log('✅ Состояние обновлено')

		return streamInfo
	}
}

export default TwitchService
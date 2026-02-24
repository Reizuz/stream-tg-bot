// modules/moduleImages.js
import fs from 'fs'
import path from 'path'
import sharp from 'sharp' // npm install sharp

class ImageService {
	constructor() {
		this.imagePath = path.join(process.cwd(), 'assets', 'stream-preview.jpg')
		this.gamesPath = path.join(process.cwd(), 'assets', 'games')  // новая папка
		this.gameCache = new Map()  // кэш для картинок игр
		this.imageBuffer = null
		this.loadAndOptimizeImage()
	}

	async loadAndOptimizeImage() {
		try {
			if (!fs.existsSync(this.imagePath)) {
				console.log('⚠️ Картинка не найдена:', this.imagePath)
				return false
			}

			// Читаем оригинал
			this.originalBuffer = fs.readFileSync(this.imagePath)
			console.log('📸 Оригинал:', this.originalBuffer.length, 'байт')

			// Оптимизируем
			this.optimizedBuffer = await sharp(this.originalBuffer)
				.resize(1280, 720, { // Максимальный размер для Telegram
					fit: 'inside',
					withoutEnlargement: true
				})
				.jpeg({
					quality: 80,      // Качество 80%
					mozjpeg: true      // Лучшее сжатие
				})
				.toBuffer()

			console.log('✅ Оптимизировано:', this.optimizedBuffer.length, 'байт')
			console.log('📉 Сжатие:', Math.round((1 - this.optimizedBuffer.length / this.originalBuffer.length) * 100), '%')

			return true

		} catch (error) {
			console.error('❌ Ошибка оптимизации:', error)
			return false
		}
	}

	hasImage() {
		return this.optimizedBuffer !== null
	}

	getImage() {
		if (!this.hasImage()) return null
		return { source: this.optimizedBuffer }  // 👈 Используем optimizedBuffer
	}

	async getStreamImage(gameName) {  // 👈 добавить async
		if (gameName) {
			const gameImage = await this.getGameImage(gameName)  // 👈 добавить await
			if (gameImage) {
				console.log(`🎮 Использую картинку для игры: ${gameName}`)
				return { source: gameImage }
			}
		}
		return this.getImage()
	}

	// Если нужен оригинал
	getOriginalImage() {
		if (!this.originalBuffer) return null
		return { source: this.originalBuffer }
	}

	getInfo() {
		return {
			hasImage: this.hasImage(),
			path: this.imagePath,
			exists: fs.existsSync(this.imagePath),
			originalSize: this.originalBuffer?.length || 0,
			optimizedSize: this.optimizedBuffer?.length || 0,
			compression: this.originalBuffer && this.optimizedBuffer
				? Math.round((1 - this.optimizedBuffer.length / this.originalBuffer.length) * 100)
				: 0
		}
	}

	sanitizeFileName(name) {
		if (!name) return ''
		return name
			.replace(/[<>:"\/\\|?*]/g, '-')  // заменяем запрещенные символы
			.replace(/\s+/g, ' ')              // нормализуем пробелы
			.trim()
	}

	async getGameImage(gameName) {
		if (!gameName) {
			console.log('❌ gameName пустой или null')
			return null
		}

		console.log(`🔍 ИЩУ КАРТИНКУ для игры: "${gameName}"`)

		const safeName = this.sanitizeFileName(gameName)
		console.log(`📝 Очищенное имя файла: "${safeName}"`)

		// Проверяем кэш
		if (this.gameCache.has(safeName)) {
			console.log(`🔄 Найдено в кэше для: ${gameName}`)
			return this.gameCache.get(safeName)
		}

		const extensions = ['.jpg', '.jpeg', '.png']
		console.log(`📁 Путь к папке с играми: ${this.gamesPath}`)

		for (const ext of extensions) {
			const fullPath = path.join(this.gamesPath, safeName + ext)
			console.log(`🔍 Проверяю: ${fullPath}`)
			console.log(`   Существует: ${fs.existsSync(fullPath) ? '✅ ДА' : '❌ НЕТ'}`)

			if (fs.existsSync(fullPath)) {
				try {
					const stats = fs.statSync(fullPath)
					console.log(`   Размер файла: ${stats.size} байт`)

					// Читаем оригинал
					const originalBuffer = fs.readFileSync(fullPath)
					console.log(`   Прочитано: ${originalBuffer.length} байт`)

					// 👇 ВАЖНО: ОПТИМИЗИРУЕМ ЧЕРЕЗ SHARP
					console.log(`   Оптимизирую через sharp...`)
					const optimizedBuffer = await sharp(originalBuffer)
						.resize(1280, 720, {
							fit: 'inside',
							withoutEnlargement: true
						})
						.jpeg({
							quality: 80,
							mozjpeg: true
						})
						.toBuffer()

					console.log(`   ✅ Оптимизировано: ${optimizedBuffer.length} байт`)
					console.log(`   📉 Сжатие: ${Math.round((1 - optimizedBuffer.length / originalBuffer.length) * 100)}%`)

					this.gameCache.set(safeName, optimizedBuffer)
					return optimizedBuffer

				} catch (error) {
					console.error(`❌ Ошибка обработки файла: ${error.message}`)
				}
			}
		}

		console.log(`❌ НЕ НАЙДЕНА картинка для игры: "${gameName}"`)
		this.gameCache.set(safeName, null)
		return null
	}
}

// Создаем и сразу оптимизируем
export const imageService = new ImageService()
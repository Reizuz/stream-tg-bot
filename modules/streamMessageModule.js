// modules/streamMessageModule.js

class StreamMessageModule {
	constructor() {
		this.messageId = null;
		this.chatId = null;
		this.streamStartTime = null;
		this.updateInterval = null;
		this.isActive = false;
		this.updateStarted = false; // Флаг, что обновления уже запущены после 10 минут
	}

	// Сохраняем ID сообщения при старте стрима
	setMessageInfo(chatId, messageId) {
		this.chatId = chatId;
		this.messageId = messageId;
		this.streamStartTime = Date.now();
		this.updateStarted = false;
		console.log(`📝 Сообщение стрима сохранено: ${messageId}`);
	}

	// Форматируем время
	formatDuration(minutes) {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;

		if (hours > 0) {
			return `${hours} ч ${mins} мин`;
		}
		return `${mins} мин`;
	}

	// Создаем текст для обновления
	createUpdateText(streamInfo, minutes) {
		const duration = this.formatDuration(minutes);
		const viewers = streamInfo.viewerCount?.toLocaleString() || '0';

		return `🔴 *СТРИМ ИДЕТ* 

*${streamInfo.title}*

⏱ Длительность: ${duration}
👁‍🗨 Онлайн: ${viewers} зрителей

🎮 Игра: ${streamInfo.gameName || 'Не указана'}

Заходите на стрим! 👇`;
	}

	// Запускаем проверку длительности и обновление
	async startUpdating(bot, streamInfo, socialService) {
		if (this.updateInterval) {
			clearInterval(this.updateInterval);
		}

		this.isActive = true;

		// Запускаем проверку каждую минуту
		this.updateInterval = setInterval(async () => {
			if (!this.isActive || !this.messageId) {
				return;
			}

			// Вычисляем текущую длительность в минутах
			const minutes = Math.floor((Date.now() - this.streamStartTime) / 60000);

			// Проверяем, прошло ли 10 минут
			if (minutes >= 2) {
				// Если обновления еще не запущены, запускаем
				if (!this.updateStarted) {
					console.log(`⏱ Стрим идет ${minutes} минут - начинаем регулярные обновления`);
					this.updateStarted = true;
				}

				// Обновляем сообщение
				try {
					await this.updateMessage(bot, streamInfo, minutes, socialService);
					console.log(`🔄 Сообщение обновлено: ${minutes} мин, ${streamInfo.viewerCount} зрителей`);
				} catch (error) {
					console.error('❌ Ошибка обновления сообщения:', error.message);

					// Если сообщение удалено, останавливаем обновления
					if (error.description?.includes('message to edit not found')) {
						console.log('⚠️ Сообщение не найдено, останавливаю обновления');
						this.stopUpdating();
					}
				}
			} else {
				// Если еще нет 10 минут, просто логируем
				console.log(`⏳ До начала обновлений: ${10 - minutes} мин`);
			}
		}, 60000); // Проверяем каждую минуту
	}

	// Обновляем одно сообщение
	async updateMessage(bot, streamInfo, minutes, socialService) {
		if (!this.messageId || !this.chatId) {
			throw new Error('Нет сохраненного сообщения');
		}

		const updateText = this.createUpdateText(streamInfo, minutes);
		const keyboard = socialService.createKeyboard();

		try {
			await bot.telegram.editMessageText(
				this.chatId,
				this.messageId,
				null,
				updateText,
				{
					parse_mode: 'Markdown',
					reply_markup: keyboard?.reply_markup
				}
			);
		} catch (error) {
			// Если ошибка "message is not modified" - игнорируем
			if (!error.description?.includes('message is not modified')) {
				throw error;
			}
		}
	}

	// Обновляем количество зрителей (для вызова извне)
	async updateViewers(bot, streamInfo, socialService) {
		if (!this.isActive || !this.messageId || !this.updateStarted) {
			return; // Обновляем только если прошло 10 минут
		}

		const minutes = Math.floor((Date.now() - this.streamStartTime) / 60000);
		await this.updateMessage(bot, streamInfo, minutes, socialService);
	}

	// Принудительное обновление (для команды /updatestats)
	async forceUpdate(bot, streamInfo, socialService) {
		if (!this.isActive || !this.messageId) {
			throw new Error('Нет активного стрима');
		}

		const minutes = Math.floor((Date.now() - this.streamStartTime) / 60000);

		// Если еще нет 10 минут, но вызывают принудительно - все равно обновляем
		if (minutes < 10) {
			console.log(`⚠️ Принудительное обновление до 10 минут (${minutes} мин)`);
		}

		await this.updateMessage(bot, streamInfo, minutes, socialService);
		return minutes;
	}

	// Получить текущую длительность
	getCurrentDuration() {
		if (!this.streamStartTime) return 0;
		return Math.floor((Date.now() - this.streamStartTime) / 60000);
	}

	// Проверить, прошло ли 10 минут
	isTenMinutesPassed() {
		return this.getCurrentDuration() >= 10;
	}

	// Останавливаем обновления
	stopUpdating() {
		if (this.updateInterval) {
			clearInterval(this.updateInterval);
			this.updateInterval = null;
		}
		this.isActive = false;
		this.updateStarted = false;
		console.log('⏹ Обновление сообщения остановлено');
	}

	// Сбрасываем при завершении стрима
	reset() {
		this.stopUpdating();
		this.messageId = null;
		this.chatId = null;
		this.streamStartTime = null;
		this.updateStarted = false;
	}
}

// Создаем и экспортируем экземпляр
export const streamMessageModule = new StreamMessageModule();
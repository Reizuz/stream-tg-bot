// config/socials.js

/**
 * Конфигурация кнопок с соцсетями
 * Каждый объект в массиве - одна кнопка
 * Можно группировать по рядам
 */

export const socialsConfig = {
	// Включить/выключить отображение кнопок
	enabled: true,
	events: {
		// Отправлять сообщение о начале стрима
		streamStart: true,

		// Отправлять сообщение об окончании стрима
		streamEnd: false,

		// Отправлять сообщение об изменении названия
		streamTitleChange: false
	},
	// Настройки отображения
	settings: {
		showDescriptions: true,     // Показывать описания
		openInNewTab: true,         // Открывать в новой вкладке
	},

	// Ряды кнопок (каждый массив - новый ряд)
	buttons: [
		// Ряд 1: Twitch и YouTube
		[
			{
				emoji: '🟣',
				name: 'Twitch',
				url: 'https://www.twitch.tv/reizuz',
				description: 'Смотреть стрим'
			},
			{
				emoji: '🔴',
				name: 'YouTube',
				url: 'https://www.youtube.com/@reizuz1',
				description: 'Записи'
			}
		],
		// Ряд 2: Telegram и Boosty
		[
			{
				emoji: '🔵',
				name: 'Telegram',
				url: 'https://t.me/reizuzstream',
				description: 'Мой канал'
			},
			{
				emoji: '💰',
				name: 'Boosty',
				url: 'https://boosty.to/reizuz',
				description: 'Поддержка'
			}
		],
		// Ряд 3: DonationAlerts (одна кнопка на весь ряд)
		[
			{
				emoji: '⚡',
				name: 'DonationAlerts',
				url: 'https://dalink.to/reizuz',
				description: 'Угостить автора'
			}
		]
	]
}

/**
 * Альтернативные варианты раскладки (можно переключать)
 */
export const socialsLayouts = {
	// Компактный вариант (без описаний)
	compact: {
		enabled: true,
		settings: { showDescriptions: false },
		buttons: [
			[
				{ emoji: '🟣', name: 'Twitch', url: 'https://twitch.tv/reizuz' },
				{ emoji: '🔴', name: 'YouTube', url: 'https://youtube.com/@reizuz1' }
			],
			[
				{ emoji: '🔵', name: 'Telegram', url: 'https://t.me/reizuzstream' },
				{ emoji: '💰', name: 'Boosty', url: 'https://boosty.to/reizuz' }
			],
			[
				{ emoji: '⚡', name: 'DA', url: 'https://dalink.to/reizuz' }
			]
		]
	},

	// Расширенный вариант (с иконками и описаниями)
	extended: {
		enabled: true,
		settings: { showDescriptions: true },
		buttons: [
			[
				{ emoji: '🟣', name: 'Twitch', url: 'https://twitch.tv/reizuz', description: 'Смотреть стрим' },
				{ emoji: '🔴', name: 'YouTube', url: 'https://youtube.com/@reizuz1', description: 'Видео' }
			],
			[
				{ emoji: '🔵', name: 'Telegram', url: 'https://t.me/reizuzstream', description: 'Новости' },
				{ emoji: '💰', name: 'Boosty', url: 'https://boosty.to/reizuz', description: 'Донаты' }
			],
			[
				{ emoji: '⚡', name: 'DonationAlerts', url: 'https://dalink.to/reizuz', description: 'Поддержка' }
			]
		]
	}
}

// По умолчанию экспортируем основной конфиг
export default socialsConfig
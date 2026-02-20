import { Markup } from "telegraf"
import socialConfig from "../config/social.js"

class SocialService {
	constructor(config = socialConfig) {
		this.config = config
	}
	//Проверяем, включен ли модуль
	isEnabled() {
		return this.config.enabled
	}
	//Создаем клавиатуру
	createKeyboard() {
		if (!this.isEnabled()) {
			return null
		}

		const keyboard = this.config.buttons.map(row => {
			return row.map(button => {
				//Создаем текст кнопки
				let buttonText = `${button.emoji} ${button.name}`
				if (this.config.settings.showDescriptions && button.description) {
					buttonText += ` — ${button.description}`
				}

				return Markup.button.url(buttonText, button.url)
			})
		})

		return Markup.inlineKeyboard(keyboard)
	}
	//Создаем текстовые ссылки
	createTextLinks() {
		if (!this.isEnabled()) {
			return ''
		}

		const links = []

		this.config.buttons.forEach(row => {
			row.forEach(button => {
				let linkText = `${button.emoji} ${button.name}`
				if (this.config.settings.showDescriptions && button.description) {
					linkText += ` — ${button.description}`
				} else {
					links.push(`${button.emoji} ${button.name}`)
				}
			})
		})

		return links.join('\n')
	}
	//получаем статистику по кнопкам
	getStats() {
		const totalButtons = this.config.buttons.reduce(
			(acc, row) => acc + row.length, 0
		)

		return {
			enabled: this.isEnabled(),
			rows: this.config.buttons.length,
			buttons: totalButtons,
			settings: this.config.settings
		}
	}
	//обновляем конфиг
	updateConfig(newConfig) {
		this.config = newConfig
		console.log('🔄 Конфиг соцсетей обновлён')
	}
}

// Создаём и экспортируем единственный экземпляр
export const socialService = new SocialService()
export default socialService

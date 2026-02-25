// modules/updateChecker.js
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UpdateChecker {
    constructor() {
        this.repoOwner = 'reizuz';
        this.repoName = 'stream-bot';
        this.githubApiUrl = `https://api.github.com/repos/reizuz/stream-bot/releases/latest`;
        this.packageJsonPath = path.join(__dirname, '..', 'package.json');
        this.currentVersion = null;
    }

    // Получить текущую версию из package.json
    getCurrentVersionFromPackage() {
        try {
            if (fs.existsSync(this.packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
                this.currentVersion = packageJson.version;
                console.log(`📦 Текущая версия из package.json: ${this.currentVersion}`);
                return this.currentVersion;
            } else {
                throw new Error('package.json не найден');
            }
        } catch (error) {
            console.error('❌ Ошибка чтения package.json:', error.message);
            return null;
        }
    }

    // Проверить последнюю версию на GitHub
    async checkLatestVersion() {
        try {
            console.log('🔄 Проверка обновлений на GitHub...');
            
            const response = await axios.get(this.githubApiUrl, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Stream-Bot'
                },
                timeout: 5000 // Таймаут 5 секунд
            });

            // Убираем 'v' из тега если есть (v1.2.3 -> 1.2.3)
            const latestVersion = response.data.tag_name.replace(/^v/, '');
            const releaseUrl = response.data.html_url;
            const publishedAt = new Date(response.data.published_at).toLocaleDateString('ru-RU');
            const body = response.data.body;

            console.log(`✅ Последняя версия на GitHub: ${latestVersion}`);

            // Получаем текущую версию
            if (!this.currentVersion) {
                this.getCurrentVersionFromPackage();
            }

            return {
                currentVersion: this.currentVersion,
                latestVersion,
                releaseUrl,
                publishedAt,
                body,
                hasUpdate: this.compareVersions(this.currentVersion, latestVersion) > 0
            };
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('⚠️ Релизов не найдено, проверяю теги...');
                return await this.checkLatestTag();
            }
            console.error('❌ Ошибка проверки GitHub:', error.message);
            return null;
        }
    }

    // Проверить последний тег (если нет релизов)
    async checkLatestTag() {
        try {
            const response = await axios.get(
                `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/tags`,
                {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'Stream-Bot'
                    },
                    timeout: 5000
                }
            );

            if (response.data && response.data.length > 0) {
                const latestTag = response.data[0].name.replace(/^v/, '');
                const releaseUrl = `https://github.com/${this.repoOwner}/${this.repoName}/releases/tag/${response.data[0].name}`;
                
                console.log(`✅ Последний тег на GitHub: ${latestTag}`);
                
                return {
                    currentVersion: this.currentVersion,
                    latestVersion: latestTag,
                    releaseUrl,
                    publishedAt: 'неизвестно',
                    body: 'Используйте git pull для обновления',
                    hasUpdate: this.compareVersions(this.currentVersion, latestTag) > 0
                };
            }
        } catch (error) {
            console.error('❌ Ошибка проверки тегов:', error.message);
        }
        return null;
    }

    // Сравнение версий (возвращает >0 если новая версия больше)
    compareVersions(current, latest) {
        if (!current || !latest) return 0;
        
        const currentParts = current.split('.').map(Number);
        const latestParts = latest.split('.').map(Number);
        
        for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
            const curr = currentParts[i] || 0;
            const lat = latestParts[i] || 0;
            if (lat > curr) return 1;
            if (lat < curr) return -1;
        }
        return 0;
    }

    // Выполнить обновление
    async performUpdate(ctx) {
        try {
            await ctx.reply('🔄 Начинаю обновление... Это может занять несколько минут.');

            // 1. Сохраняем текущие изменения (если есть)
            await ctx.reply('📦 Сохраняю локальные изменения...');
            try {
                await execAsync('git stash');
            } catch (e) {
                console.log('Нет изменений для stash');
            }

            // 2. Получаем обновления
            await ctx.reply('📥 Скачиваю обновления с GitHub...');
            const { stdout: pullOutput } = await execAsync('git pull origin main');
            console.log('git pull output:', pullOutput);

            // 3. Обновляем зависимости
            await ctx.reply('📚 Обновляю зависимости (npm install)...');
            const { stdout: npmOutput } = await execAsync('npm install');
            console.log('npm install output:', npmOutput);

            // 4. Читаем новую версию из package.json
            this.getCurrentVersionFromPackage();

            await ctx.reply(`✅ Обновление завершено! Текущая версия: ${this.currentVersion}\n\n🔄 Перезапустите бота для вступления изменений в силу`);
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка обновления:', error);
            await ctx.reply(`❌ Ошибка при обновлении: ${error.message}`);
            return false;
        }
    }

    // Форматировать сообщение о обновлении
    formatUpdateMessage(updateInfo) {
        return `✨ *Доступно обновление!*

Текущая версия: \`${updateInfo.currentVersion}\`
Новая версия: \`${updateInfo.latestVersion}\`
Дата релиза: ${updateInfo.publishedAt}

*Что нового:*
${updateInfo.body ? updateInfo.body.substring(0, 500) : 'Описание недоступно'}${updateInfo.body?.length > 500 ? '...' : ''}

[🔗 Открыть на GitHub](${updateInfo.releaseUrl})

Обновить сейчас?`;
    }
}

export const updateChecker = new UpdateChecker();
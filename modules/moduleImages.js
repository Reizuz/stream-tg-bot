// modules/moduleImages.js
import fs from 'fs'
import path from 'path'
import sharp from 'sharp' // npm install sharp

class ImageService {
    constructor() {
        this.imagePath = path.join(process.cwd(), 'assets', 'stream-preview.jpg')
        this.optimizedBuffer = null
        this.originalBuffer = null
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
        return { source: this.optimizedBuffer }
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
}

// Создаем и сразу оптимизируем
export const imageService = new ImageService()
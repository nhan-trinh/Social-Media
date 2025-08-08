import express from 'express'
import { getChatMessages, sendMessage, sseController } from '../controller/messageController'
import { upload } from '../configs/multer'
import { protect } from '../middleware/auth'

const messageRouter = express.Router()

messageRouter.get('/:userId', sseController)
messageRouter.post('/send', upload.single('image'),protect ,sendMessage)
messageRouter.post('/get', protect, getChatMessages)

export default messageRouter

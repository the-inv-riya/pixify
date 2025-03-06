import express from 'express'
import { registerUser, loginUser, userCredits, createPayment, verifyPayment} from '../controllers/userController.js'
import userAuth from '../middlewares/auth.js'

const userRouter = express.Router()

userRouter.post('/register', registerUser)
userRouter.post('/login', loginUser)
userRouter.get('/credits', userAuth , userCredits)
userRouter.post('/create-payment', userAuth, createPayment);
userRouter.post('/verify-payment', verifyPayment);

export default userRouter
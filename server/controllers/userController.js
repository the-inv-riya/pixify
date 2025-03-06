import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Stripe from 'stripe';
import transactionModel from '../models/transactionModel.js';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.json({ success: false, message: "Missing Details" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      name,
      email,
      password: hashedPassword,
    };

    const newUser = new userModel(userData);
    const user = await newUser.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.json({ success: true, token, user: { name: user.name } });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "User does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

      res.json({ success: true, token, user: { name: user.name } });
    } else {
      return res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const userCredits = async (req, res) => {
  try {
    const { userId } = req.body;
    console.log(req.body)

    const user = await userModel.findById(userId);

    res.json({
      success: true,
      credits: user.creditBalance,
      user: { name: user.name },
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const createPayment = async (req, res) => {
  try {
    const { userId, planId } = req.body;

    if (!userId || !planId) {
      return res.json({ success: false, message: 'Missing Details' });
    }

    let credits, plan, amount, date;

    switch (planId) {
      case 'Basic':
        plan = 'Basic';
        credits = 100;
        amount = 49;
        break;
      case 'Advanced':
        plan = 'Advanced';
        credits = 500;
        amount = 299;
        break;
      case 'Business':
        plan = 'Business';
        credits = 5000;
        amount = 999;
        break;
      default:
        return res.json({ success: false, message: 'Plan not found' });
    }

    date = Date.now();

    const transactionData = {
      userId, plan, amount, credits, date
    }

    const newTransaction = await transactionModel.create(transactionData)

    const amountConverted = amount * 100;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `${plan} Credit Plan`,
              description: `${credits} Credits`,
            },
            unit_amount: amountConverted,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/`,
      cancel_url: `${process.env.FRONTEND_URL}/buy`,
      metadata: {
        transactionId: newTransaction._id.toString(),
        userId: userId.toString(),
        credits: credits.toString(),
      },
    });

    res.json({ success: true, sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Payment creation error:', error);
    res.json({ success: false, message: error.message });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Session ID is required" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const transactionId = session.metadata?.transactionId;
      const userId = session.metadata?.userId;
      const credits = parseInt(session.metadata?.credits, 10);

      if (!transactionId || !userId || isNaN(credits)) {
        return res.status(400).json({ success: false, message: "Invalid session metadata" });
      }

      const transactionData = await transactionModel.findById(transactionId);
      if (!transactionData) {
        return res.status(404).json({ success: false, message: "Transaction not found" });
      }

      if (transactionData.payment) {
        return res.json({ success: false, message: "Payment already processed" });
      }

      const userData = await userModel.findById(transactionData.userId)

      if (!userData) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const creditBalance = userData.creditBalance + transactionData.credits
      await userModel.findByIdAndUpdate(userData._id, {creditBalance})
      await transactionModel.findByIdAndUpdate(transactionData._id, {payment: true})

      res.json({ success: true, message: "Credits Added Successfully!"})
    } else {
      return res.json({ success: false, message: "Payment not completed" });
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
export { registerUser, loginUser, userCredits, createPayment, verifyPayment};

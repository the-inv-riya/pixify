import React, { useContext, useEffect } from "react";
import { assets, plans } from "../assets/assets";
import { AppContext } from '../context/AppContext'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";

const BuyCredit = () => {

  // const {user} = useContext(AppContext)
  const {user, backendUrl, loadCreditsData, token, setShowLogin} = useContext(AppContext)

  const navigate = useNavigate()

  const [searchParams] = useSearchParams();

  // const initPay = async (order)=>{
  //   const options = {
  //     key: import.meta.env.VITE_RAZORPAY_KEY_ID,
  //     amount: order.amount,
  //     currency: order.currency,
  //     name: 'Credits Payment',
  //     description: 'Credits Payment',
  //     order_id: order.id,
  //     receipt: order.receipt,
  //     handler: async (response)=>{
  //       try {
  //         const {data} = await axios.post(backendUrl + '/api/user/verify-razor', response, {headers: {token}})
  //         if (data.success) {
  //           loadCreditsData();
  //           navigate('/')
  //           toast.success('Credit Added')
  //         }
  //       } catch (error) {
  //         toast.error(error.message)
  //       }
  //     }
  //   }

  //   const rzp = new window.Razorpay(options)
  //   rzp.open()
  // }

  // const paymentRazorpay = async (planId)=>{
  //   try {
  //     if (!user) {
  //       setShowLogin(true)
  //     }

  //     const {data} = await axios.post(backendUrl + '/api/user/pay-razor', {planId}, {headers: {token}})

  //     if (data.success) {
  //       initPay(data.order)
  //     } 

  //   } catch(error) {
  //     toast.error(error.message)
  //   }
  // }

  useEffect(() => {
    // Check for successful payment
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      verifyPayment(sessionId);
    }
  }, [searchParams]);

  const handlePayment = async (planId) => {
    try {
      if (!user) {
        setShowLogin(true);
        return;
      }

      const { data } = await axios.post(
        backendUrl + '/api/user/create-payment',{ planId }, { headers: { token } }
      );

      if (data.success) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const verifyPayment = async (sessionId) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/verify-payment`,
        { sessionId },
        { headers: { token } }
      );
  
      console.log("Payment Verification Response:", data);
  
      if (data.success) {
        await loadCreditsData(); // Ensure this correctly updates the state
        navigate("/");
        toast.success("Credits Added Successfully");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      toast.error(error.message);
    }
  };

  return (
    <motion.div className="min-h-[80vh] text-center pt-14 mb-10"
    initial={{ opacity : 0.2, y : 100}}
    transition={{ duration : 1 }}
    whileInView={{ opacity : 1, y : 0}}
    viewport={{ once : true}}
    >
      <button className="border border-gray-400 px-10 py-2 rounded-full mb-6">
        Our Plans
      </button>
      <h1 className="text-center text-3xl font-medium mb-6 sm:mb-10">
        Choose the plan
      </h1>

      <div className="flex flex-wrap justify-center gap-6 text-left">
        {plans.map((item, index)=>(
          <div key={index} className="bg-white drop-shadow-sm border rounded-lg py-12 px-8 text-gray-600 hover:scale-105 transition-all duration-500">
            <img src={assets.logo_icon} alt="" width={40}/>
            <p className="mt-3 mb-1 font-semibold">{item.id}</p>
            <p className="text-sm">{item.desc}</p>
            <p className="mt-6"><span className="text-3xl font-medium">₹{item.price} </span>/ {item.credits} credits</p>
            <button onClick={() => handlePayment(item.id)} className="w-full bg-gray-800 text-white mt-8 text-sm rounded-md py-2.5 min-w-52">{user ? 'Purchase' : 'Get Started'}</button>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default BuyCredit;
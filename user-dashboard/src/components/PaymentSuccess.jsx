import React from 'react';
import { FiCheckCircle, FiDownload, FiPrinter, FiShare2 } from 'react-icons/fi';

const PaymentSuccess = ({ orderDetails }) => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div className="p-8">
          <div className="flex flex-col items-center">
            {/* Success Icon */}
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <FiCheckCircle className="h-6 w-6 text-green-600" />
            </div>
            
            {/* Success Message */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 mb-6">Thank you for your purchase</p>
            
            {/* Order Summary */}
            <div className="w-full border-t border-gray-200 pt-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
              
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Order ID</span>
                <span className="text-gray-900 font-medium">{orderDetails.orderId}</span>
              </div>
              
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Date</span>
                <span className="text-gray-900 font-medium">{orderDetails.date}</span>
              </div>
              
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Amount</span>
                <span className="text-gray-900 font-medium">{orderDetails.amount}</span>
              </div>
              
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Payment Method</span>
                <span className="text-gray-900 font-medium">{orderDetails.paymentMethod}</span>
              </div>
            </div>
            
            {/* Download Receipt Button */}
            <button className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 mb-4">
              <FiDownload className="mr-2" />
              Download Receipt
            </button>
            
            {/* Additional Actions */}
            <div className="flex space-x-4 mt-4">
              <button className="flex items-center text-gray-600 hover:text-gray-900">
                <FiPrinter className="mr-1" />
                <span>Print</span>
              </button>
              <button className="flex items-center text-gray-600 hover:text-gray-900">
                <FiShare2 className="mr-1" />
                <span>Share</span>
              </button>
            </div>
            
            {/* Continue Shopping Button */}
            <div className="mt-8">
              <a href="/" className="text-indigo-600 hover:text-indigo-500 font-medium">
                ← Continue Shopping
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Example usage:
// <PaymentSuccess 
//   orderDetails={{
//     orderId: "#123456",
//     date: "June 5, 2023",
//     amount: "$49.99",
//     paymentMethod: "Visa ****4242"
//   }}
// />

export default PaymentSuccess;
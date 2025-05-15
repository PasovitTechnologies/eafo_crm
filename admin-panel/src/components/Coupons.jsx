import React, { useState } from 'react'
import './Coupons.css'

const Coupons = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleAddCoupon = async () => {
    try {
      const response = await fetch('/api/coupons/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: couponCode }),
      })

      if (response.ok) {
        setSuccessMessage('Coupon added successfully!')
        setErrorMessage('')
        setCouponCode('')
        setIsModalOpen(false)
      } else {
        const data = await response.json()
        throw new Error(data.message || 'Failed to add coupon')
      }
    } catch (error) {
      setErrorMessage(error.message)
      setSuccessMessage('')
    }
  }

  return (
    <div className="coupons-container">
      <div className="coupons-header">
        <h2>Coupons</h2>
        <button className="add-button" onClick={() => setIsModalOpen(true)}>
          Add Coupon
        </button>
      </div>

      {successMessage && <p className="success">{successMessage}</p>}
      {errorMessage && <p className="error">{errorMessage}</p>}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add New Coupon</h3>
            <input
              type="text"
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="coupon-input"
            />
            <div className="modal-actions">
              <button onClick={() => setIsModalOpen(false)} className="cancel-button">
                Cancel
              </button>
              <button onClick={handleAddCoupon} className="submit-button">
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Coupons

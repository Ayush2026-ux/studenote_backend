# Razorpay Frontend Integration - Complete Guide

## 1. Add Razorpay Script to HTML

Add this to your `public/index.html` or main layout:

```html
<!-- Add before closing </head> tag -->
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

---

## 2. React Component - Complete Payment Integration

### Create File: `src/components/Payment/RazorpayCheckout.jsx`

```jsx
import React, { useState } from 'react';
import axios from 'axios';

const RazorpayCheckout = ({ noteId, onPaymentSuccess, onPaymentError }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async () => {
    setLoading(true);
    setError('');

    try {
      // Step 1: Create Order from Backend
      const token = localStorage.getItem('token'); // Your auth token
      
      const orderResponse = await axios.post(
        'http://localhost:4000/api/payments/create-order',
        { noteId },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const { orderId, totalAmount, platformFee } = orderResponse.data;

      // Step 2: Open Razorpay Checkout with ALL payment methods
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID, // Your Key ID
        amount: totalAmount * 100, // Amount in paise
        currency: 'INR',
        name: 'Studenote',
        description: 'Purchase Premium Note',
        order_id: orderId,
        
        // Display all payment methods
        method: {
          netbanking: true,
          card: true,
          upi: true,
          wallet: true,
          emi: false,
        },

        handler: async (response) => {
          try {
            // Step 3: Verify Payment on Backend
            const verifyResponse = await axios.post(
              'http://localhost:4000/api/payments/verify',
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            if (verifyResponse.data.success) {
              console.log(' Payment Successful!');
              if (onPaymentSuccess) {
                onPaymentSuccess(response);
              }
              // Redirect to success page or show success message
            }
          } catch (err) {
            console.error('Payment Verification Failed:', err);
            setError('Payment verification failed');
            if (onPaymentError) {
              onPaymentError(err);
            }
          }
        },

        prefill: {
          // Pre-fill user details if available
          name: localStorage.getItem('userName') || '',
          email: localStorage.getItem('userEmail') || '',
          contact: localStorage.getItem('userPhone') || '',
        },

        theme: {
          color: '#3399cc' // Your brand color
        },

        // Show payment methods
        display: {
          blocks: {
            // Order in which payment methods appear
            netbanking: {
              name: 'Net Banking',
              instruments: [
                { key: 'HDFC', name: 'HDFC Bank' },
                { key: 'ICIC', name: 'ICICI Bank' },
                { key: 'UTIB', name: 'Axis Bank' },
                { key: 'KKBK', name: 'Kotak Bank' },
                { key: 'INDB', name: 'IndusInd Bank' },
              ]
            },
            card: {
              name: 'Debit / Credit Card',
              instruments: [
                { key: 'Visa', name: 'Visa Card' },
                { key: 'Mastercard', name: 'Mastercard' },
              ]
            },
            upi: {
              name: 'UPI',
            },
            wallet: {
              name: 'Wallets',
              instruments: [
                { key: 'olamoney', name: 'Ola Money' },
                { key: 'payzapp', name: 'PayZapp' },
                { key: 'airtel', name: 'Airtel Money' },
              ]
            }
          },
          hide: [], // Hide specific payment methods if needed
          sequence: ['block.netbanking', 'block.card', 'block.upi', 'block.wallet'],
          preferences: {
            show_default_blocks: true, // Show default payment methods
          }
        },

        modal: {
          ondismiss: () => {
            console.log('Payment modal closed');
            setLoading(false);
          },
          style: {
            backgroundColor: '#ffffff'
          }
        },

        redirect: false, // Don't auto-redirect
        timeout: 600, // Timeout in seconds (10 minutes)
      };

      // Open Razorpay Checkout
      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (err) {
      console.error('❌ Payment Setup Error:', err);
      setError(err.response?.data?.message || 'Failed to initialize payment');
      if (onPaymentError) {
        onPaymentError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          ❌ {error}
        </div>
      )}
      
      <button
        onClick={handlePayment}
        disabled={loading}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#3399cc',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1
        }}
      >
        {loading ? 'Processing...' : '🛒 Buy Now'}
      </button>
    </div>
  );
};

export default RazorpayCheckout;
```

---

## 3. Environment Variables

Create `.env` file in your React project:

```env
REACT_APP_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
REACT_APP_API_BASE_URL=http://localhost:4000
```

---

## 4. Usage in Your Page

```jsx
import RazorpayCheckout from './components/Payment/RazorpayCheckout';

function NotePage() {
  const noteId = '697b5c638640859e7129ebc4'; // Your note ID

  const handlePaymentSuccess = (response) => {
    console.log('Payment successful:', response);
    // Show success message, redirect, etc.
    alert('✅ Payment successful! Thank you for your purchase.');
  };

  const handlePaymentError = (error) => {
    console.log('Payment error:', error);
    // Show error message
  };

  return (
    <div>
      <h1>Premium Note</h1>
      <p>Price: ₹1000 + ₹25 (platform fee)</p>
      
      <RazorpayCheckout
        noteId={noteId}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
      />
    </div>
  );
}

export default NotePage;
```

---

## 5. Payment Methods Available

The checkout will display:

### 🏦 **Net Banking**
- HDFC Bank
- ICICI Bank
- Axis Bank
- Kotak Bank
- IndusInd Bank
- + 40+ other banks

### 💳 **Cards**
- Visa
- Mastercard
- American Express
- Diners Club
- RuPay

### 📱 **UPI**
- Google Pay
- Apple Pay
- Paytm
- WhatsApp Pay
- BHIM
- Other UPI apps

### 💰 **Wallets**
- Ola Money
- PayZapp
- Airtel Money
- Freecharge
- Mobikwik
- Amazon Pay

---

## 6. Next.js Integration (if using Next.js)

### Create File: `components/Payment/RazorpayCheckout.tsx`

```typescript
'use client'; // Mark as client component

import { useState } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function RazorpayCheckout({ noteId }: { noteId: string }) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    try {
      // Create order
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ noteId })
      });

      const { orderId, totalAmount } = await orderRes.json();

      // Open Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: totalAmount * 100,
        currency: 'INR',
        name: 'Studenote',
        order_id: orderId,
        handler: async (response: any) => {
          // Verify payment
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
          });

          if (verifyRes.ok) {
            alert(' Payment successful!');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      alert('❌ Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handlePayment} disabled={loading}>
      {loading ? 'Processing...' : '🛒 Buy Now'}
    </button>
  );
}
```

---

## 7. Razorpay Checkout Features

 **Smart Payment Gateway**
- Shows best payment methods for user
- Auto-detects location
- Multiple currency support
- Device-optimized UI

 **Security**
- PCI-DSS compliant
- Encrypted transactions
- HTTPS only
- 3D Secure support

 **Customization**
- Custom theme colors
- Logo upload
- Branding options
- Payment method selection

---

## 8. Troubleshooting

### Issue: "Razorpay is not defined"
**Solution:** Ensure script tag is loaded
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### Issue: Payment methods not showing
**Solution:** Check display config and browser permissions

### Issue: CORS errors
**Solution:** Add your frontend URL to Razorpay whitelist in dashboard

---

## 9. Testing Cards

### Test Mode Cards (Razorpay Test Account)

| Card | Details |
|------|---------|
| Visa Success | 4111 1111 1111 1111 |
| Visa Failure | 4222 2222 2222 2220 |
| Mastercard | 5555 5555 5555 4444 |
| Exp Date | Any future date |
| CVV | Any 3 digits |

---

**Copy this code to your frontend and Google Pay, Apple Pay, UPI, and all payment methods will work!** 🚀

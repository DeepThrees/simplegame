// api/bitcoin/check.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { payment_id } = req.query;

    if (!payment_id) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    // Cryptomus 결제 상태 확인
    const response = await fetch(`https://api.cryptomus.com/v1/payment/info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchant': process.env.CRYPTOMUS_MERCHANT_ID,
        'sign': generateSignature({ uuid: payment_id })
      },
      body: JSON.stringify({
        uuid: payment_id
      })
    });

    const data = await response.json();

    if (data.state === 0) {
      const payment = data.result;
      
      return res.status(200).json({
        success: true,
        status: payment.status, // pending, paid, fail, etc.
        payment_status: payment.payment_status,
        amount_received: payment.amount,
        confirmations: payment.confirmations || 0,
        is_final: payment.is_final
      });
    } else {
      throw new Error(data.message || 'Payment check failed');
    }

  } catch (error) {
    console.error('Payment check error:', error);
    return res.status(500).json({ 
      error: 'Payment check failed',
      details: error.message 
    });
  }
}

function generateSignature(data) {
  const crypto = require('crypto');
  const dataString = JSON.stringify(data);
  const hash = crypto.createHash('md5')
    .update(Buffer.from(dataString).toString('base64') + process.env.CRYPTOMUS_API_KEY)
    .digest('hex');
  return hash;
}

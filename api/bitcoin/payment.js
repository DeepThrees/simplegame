// api/bitcoin/payment.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { adText, amount = 0.001 } = req.body;

    if (!adText || adText.trim().length === 0) {
      return res.status(400).json({ error: 'Ad text is required' });
    }

    // Cryptomus API 호출
    const response = await fetch('https://api.cryptomus.com/v1/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchant': process.env.CRYPTOMUS_MERCHANT_ID,
        'sign': generateSignature(req.body)
      },
      body: JSON.stringify({
        amount: amount.toString(),
        currency: 'BTC',
        order_id: `ad_${Date.now()}`,
        url_callback: `${process.env.VERCEL_URL}/api/bitcoin/callback`,
        url_success: `${process.env.VERCEL_URL}/success`,
        additional_data: adText,
        lifetime: 900 // 15분
      })
    });

    const data = await response.json();

    if (data.state === 0) {
      return res.status(200).json({
        success: true,
        payment_id: data.result.uuid,
        address: data.result.address,
        amount_btc: data.result.amount,
        qr_code: data.result.qr,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      });
    } else {
      throw new Error(data.message || 'Payment creation failed');
    }

  } catch (error) {
    console.error('Payment creation error:', error);
    return res.status(500).json({ 
      error: 'Payment creation failed',
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

const forgotPassTemplate = (name, otp) => {
  return `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h2 style="color:#4CAF50;">Password Reset Request</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>We received a request to reset your account password.</p>
    <p>Please use the following One-Time Password (OTP) to reset your password:</p>

    <div style="background:#f9f9f9; padding:15px; border:1px solid #ddd; border-radius:5px; text-align:center;">
      <h1 style="letter-spacing:5px; color:#4CAF50;">${otp}</h1>
    </div>

    <p style="margin-top:20px;">⚠️ This OTP will expire in <strong>10 minutes</strong>.</p>
    <p>If you did not request this, you can safely ignore this email.</p>

    <p>Thanks,<br/>The Support Team</p>
  </div>
  `;
};

module.exports = forgotPassTemplate;

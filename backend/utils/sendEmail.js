import nodemailer from 'nodemailer';

const getMailPassword = () => process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS;

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: getMailPassword(),
    },
  });

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'CDBMS Support'}" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || options.message.replace(/\n/g, '<br>'),
  };

  await transporter.sendMail(mailOptions);
};

export default sendEmail;

const Sib = require("sib-api-v3-sdk");
const client = Sib.ApiClient.instance;
const apiKey = client.authentications["api-key"];
apiKey.apiKey = process.env.SENDINBLUE_API_KEY;

// email confirmation
module.exports.sendNewEmailConfirmToken = (emails, verificationCode) => {
  const tranEmailApi = new Sib.TransactionalEmailsApi();
  let sendSmtpEmail = new Sib.SendSmtpEmail();

  sendSmtpEmail.to = emails;
  sendSmtpEmail.templateId = 1;
  sendSmtpEmail.params = {
    VERIFICATION_CODE: verificationCode,
  };

  return tranEmailApi.sendTransacEmail(sendSmtpEmail);
};

// password reset email
module.exports.sendNewPasswordResetUrl = (emails, url) => {
  const tranEmailApi = new Sib.TransactionalEmailsApi();
  let sendSmtpEmail = new Sib.SendSmtpEmail();

  sendSmtpEmail.to = emails;
  sendSmtpEmail.templateId = 2;
  sendSmtpEmail.params = {
    PASSWORD_RESET_URL: url,
  };

  return tranEmailApi.sendTransacEmail(sendSmtpEmail);
};

const regex = {
  username: new RegExp(/^[a-zA-Z]+(?:[\s.]+[a-zA-Z]+)*\s*$/),
  serviceName: new RegExp(/^[a-zA-Z]+(?:[\s.]+[a-zA-Z]+)*\s*$/),
  storeName: new RegExp(/^[a-zA-Z]+(?:[\s.]+[a-zA-Z]+)*\s*$/),
  phoneNumber: new RegExp(/^[6-9]\d{9}$/),
  pinCode: new RegExp(/^[1-9]{1}[0-9]{2}[0-9]{3}$/),
  password: new RegExp(/^(?=.{8,})(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+*!=]).*$/),
  ifscCode: new RegExp(/^[A-Z]{4}0[A-Z0-9]{6}$/),
  gstIn: new RegExp(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  ),
  storeLinks: new RegExp(
    /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/
  ),
  panNumber: new RegExp(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/),
  referralCode: new RegExp(/^[a-z0-9]+$/i),
};

module.exports.regex = regex;

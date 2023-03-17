module.exports = (validator) => {
  return (req, res, next) => {
    const { error } = validator(req);
    if (error)
      return res.status(400).send({ message: error.details[0].message });
    next();
  };
};

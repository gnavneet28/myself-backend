const cloudinary = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports.cloudinaryMain = cloudinary;

module.exports.upload = (file, folder) => {
  return new Promise((resolve, reject) => {
    cloudinary.v2.uploader.upload(
      file,
      {
        folder: folder,
      },
      (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            public_id: res.public_id,
            url: res.secure_url,
          });
        }
      }
    );
  });
};
module.exports.uploadStream = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    cloudinary.v2.uploader
      .upload_stream({ resource_type: "image" }, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            public_id: res.public_id,
            url: res.secure_url,
          });
        }
      })
      .end(buffer);
  });
};

module.exports.remove = (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.v2.uploader.destroy(publicId, {}, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

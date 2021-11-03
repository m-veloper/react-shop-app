const express = require('express');
const router = express.Router();
const {Product} = require("../models/Product");
const multer = require('multer');
const {auth} = require("../middleware/auth");

/**
 * 파일을 저장할 위치, 파일명 설정
 * @type {DiskStorage}
 */
let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

/**
 * 파일 필터링
 * @param req
 * @param file
 * @param cb
 */
const fileFilter = (req, file, cb) => {
  // mime type 체크하여 원하는 타입만 필터링
  const ext = file.mimetype;
  if (ext === "image/png" || ext === "image/jpg"){
    // 다른 파일도 허용하고 싶다면 if (ext !== "video/mp4" || ext !== "application/pdf" )
    // 이런식으로 file.mimetype 확인하여 추가.
    return cb(null, true);
  } else {
    return cb({msg: 'jpg, png 파일만 업로드 가능합니다.'}, false);
  }
}

const upload = multer({storage: storage, fileFilter: fileFilter}).single("file");


//=================================
//             Product
//=================================

/**
 * 이미지 업로드
 */
router.post("/uploadImage", auth, (req, res) => {

  upload(req, res, err => {
    if (err) {
      return res.json({success: false, err})
    } else {
      // return res.json({success: true, image: res.req.file.path, fileName: res.req.file.filename})
      return res.json({success: true, image: req.file.path, fileName: req.file.filename});

    }
  })

});

/**
 * 이미지 정보를 DB에 저장
 */
router.post("/uploadProduct", auth, (req, res) => {

  //save all the data we got from the client into the DB
  const product = new Product(req.body)

  product.save((err) => {
    if (err) {
      return res.status(400).json({success: false, err})
    }else {
      return res.status(200).json({success: true})
    }
  })
});

/**
 * 상품목록 가져오기
 */
router.post("/getProducts", (req, res) => {

  let order = req.body.order ? req.body.order : "desc";
  let sortBy = req.body.sortBy ? req.body.sortBy : "_id";
  let limit = req.body.limit ? parseInt(req.body.limit) : 100;
  let skip = parseInt(req.body.skip);
  let term = req.body.searchTerm;
  let findArgs = {};

  // key : continents 또는 price
  for (let key in req.body.filters) {

    if (req.body.filters[key].length > 0) {
      if (key === "price") {
        findArgs[key] = {
          // gte : greater than equal
          // lte : less than equal
          $gte: req.body.filters[key][0],
          $lte: req.body.filters[key][1]
        }
      } else {
        findArgs[key] = req.body.filters[key];
      }
    }
  }

  console.log(findArgs)

  // populate : 작성자(writer)에대한 모든 정보를 가져온다
  if (term) {
    Product.find(findArgs)
      .find({$text: {$search: term}})
      .populate("writer")
      .sort([[sortBy, order]])
      .skip(skip)
      .limit(limit)
      .exec((err, products) => {
        if (err) {
          return res.status(400).json({success: false, err})
        } else {
          return res.status(200).json({success: true, products, postSize: products.length})
        }
      })
  } else {
    Product.find(findArgs)
      .populate("writer")
      .sort([[sortBy, order]])
      .skip(skip)
      .limit(limit)
      .exec((err, products) => {
        if (err) return res.status(400).json({success: false, err})
        res.status(200).json({success: true, products, postSize: products.length})
      })
  }

});


//?id=${productId}&type=single
//id=12121212,121212,1212121   type=array

router.get("/products_by_id", (req, res) => {
  let type = req.query.type
  let productIds = req.query.id

  console.log("req.query.id", req.query.id)

  if (type === "array") {
    let ids = req.query.id.split(',');
    productIds = [];
    productIds = ids.map(item => {
      return item
    })
  }

  console.log("productIds", productIds)


  //we need to find the product information that belong to product Id
  Product.find({'_id': {$in: productIds}})
    .populate('writer')
    .exec((err, product) => {
      if (err) {
        return res.status(400).send(err)
      }else {
        return res.status(200).send(product)
      }
    })
});


module.exports = router;

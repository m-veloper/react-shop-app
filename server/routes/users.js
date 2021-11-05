const express = require('express');
const router = express.Router();
const {User} = require("../models/User");
const {Product} = require("../models/Product");
const {auth} = require("../middleware/auth");
const {Payment} = require("../models/Payment");
const async = require("async");

//=================================
//             User
//=================================

router.get("/auth", auth, (req, res) => {
  res.status(200).json({
    _id: req.user._id,
    isAdmin: req.user.role === 0 ? false : true,
    isAuth: true,
    email: req.user.email,
    name: req.user.name,
    lastname: req.user.lastname,
    role: req.user.role,
    image: req.user.image,
    cart: req.user.cart,
    history: req.user.history
  });
});

router.post("/register", (req, res) => {

  const user = new User(req.body);

  user.save((err, doc) => {
    if (err) return res.json({success: false, err});
    return res.status(200).json({
      success: true
    });
  });
});

router.post("/login", (req, res) => {
  User.findOne({email: req.body.email}, (err, user) => {
    if (!user)
      return res.json({
        loginSuccess: false,
        message: "Auth failed, email not found"
      });

    user.comparePassword(req.body.password, (err, isMatch) => {
      if (!isMatch)
        return res.json({loginSuccess: false, message: "Wrong password"});

      user.generateToken((err, user) => {
        if (err) return res.status(400).send(err);
        res.cookie("w_authExp", user.tokenExp);
        res
          .cookie("w_auth", user.token)
          .status(200)
          .json({
            loginSuccess: true, userId: user._id
          });
      });
    });
  });
});

router.get("/logout", auth, (req, res) => {
  User.findOneAndUpdate({_id: req.user._id}, {token: "", tokenExp: ""}, (err, doc) => {
    if (err) return res.json({success: false, err});
    return res.status(200).send({
      success: true
    });
  });
});

/**
 * 장바구니 등록
 */
router.post('/addToCart', auth, (req, res) => {
  console.log("정보" + req.query.productId);
  // 먼저 User Collection 에 해당 유저의 정볼르 가져오기
  // 가져온 정보에서 카트에다 넣으려 하는 상품이 이미 들어있는지 확인
  User.findOne({_id: req.user._id}, (err, userInfo) => {
    let duplicate = false;

    console.log(userInfo)

    userInfo.cart.forEach((item) => {
      if (item.id == req.query.productId) {
        duplicate = true;
      }
    })

    // 상품이 이미 있을 때
    if (duplicate) {
      User.findOneAndUpdate(
        {_id: req.user._id, "cart.id": req.query.productId},
        {$inc: {"cart.$.quantity": 1}},
        {new: true},
        (err, userInfo) => {
          if (err) {
            return res.json({success: false, err});
          } else {
            return res.status(200).json(userInfo.cart)
          }
        }
      )
    }
    // 상품이 없을 때
    else {
      User.findOneAndUpdate(
        {_id: req.user._id},
        {
          $push: {
            cart: {
              id: req.query.productId,
              quantity: 1,
              date: Date.now()
            }
          }
        },
        {new: true},
        (err, userInfo) => {
          if (err) {
            return res.json({success: false, err});
          } else {
            return res.status(200).json(userInfo.cart)
          }
        }
      )
    }
  })
});

/**
 * 장바구니 삭제
 */
router.get('/removeFromCart', auth, (req, res) => {

  // 먼저 cart 안에 내가 지우려고 한 상품을 지워주기
  User.findOneAndUpdate(
    {_id: req.user._id},
    {
      "$pull":
        {"cart": {"id": req.query._id}}
    },
    {new: true},
    (err, userInfo) => {
      let cart = userInfo.cart;
      let array = cart.map(item => {
        return item.id
      })
      // product collection 에서 현재 남아있는 상품들의 정보를 가져오기
      // productIds = [61803c768c925c38d845ca6a,61803c768c925c38d845ca6a,61803c768c925c38d845ca6a] 이런식으로 바꿔주기
      Product.find({'_id': {$in: array}})
        .populate('writer')
        .exec((err, cartDetail) => {
          return res.status(200).json({
            cartDetail,
            cart
          })
        })
    }
  )
})


router.get('/userCartInfo', auth, (req, res) => {
  User.findOne(
    {_id: req.user._id},
    (err, userInfo) => {
      let cart = userInfo.cart;
      let array = cart.map(item => {
        return item.id
      })


      Product.find({'_id': {$in: array}})
        .populate('writer')
        .exec((err, cartDetail) => {
          if (err) return res.status(400).send(err);
          return res.status(200).json({success: true, cartDetail, cart})
        })

    }
  )
})

/**
 * 페이팔 결제정보 저장 처리 로직
 */
router.post('/successBuy', auth, (req, res) => {
  let history = [];
  let transactionData = {};

  // User Collection 안에 History 필드 안에 간단한 결제정보 넣기
  req.body.cartDetail.forEach((item) => {
    history.push({
      dateOfPurchase: Date.now(),
      name: item.title,
      id: item._id,
      price: item.price,
      quantity: item.quantity,
      paymentId: req.body.paymentData.paymentID
    })
  })

  // Payment Collection 안에 자세한 결제정보 넣어주기

  // user 정보 셋팅
  transactionData.user = {
    id: req.user._id,
    name: req.user.name,
    lastname: req.user.lastname,
    email: req.user.email
  }

  // 결제 정보 셋팅
  transactionData.data = req.body.paymentData;

  // 결제상품 정보 셋팅
  transactionData.product = history


  //history 정보를 저장
  User.findOneAndUpdate(
    {_id: req.user._id},
    {$push: {history: history}, $set: {cart: []}}, // $set: {cart: []} : 결제가 성공하면 장바구니안에 상품이 남아있으면 안되므로 빈값으로 셋팅
    {new: true},
    (err, user) => {
      if (err) {
        return res.json({success: false, err});
      } else {
        // payment 에다가 transactionData 정보 저장
        const payment = new Payment(transactionData)
        payment.save((err, doc) => {
          if (err) {
            return res.json({success: false, err});
          } else {

            // 판매된 상품의 판매 수량 업데이트 시켜주기
            // 1. 판매된 상품당 몇개의 수량이 판매되었는지?

            let products = [];
            doc.product.forEach(item => {
              products.push({id: item.id, quantity: item.quantity})
            })

            // first Item    quantity 2
            // second Item  quantity 3

            async.eachSeries(products, (item, callback) => {
              Product.update(
                {_id: item.id},
                {
                  $inc: {
                    "sold": item.quantity
                  }
                },
                {new: false},
                callback
              )
            }, (err) => {
              if (err) {
                return res.json({success: false, err})
              }else {
                res.status(200).json({
                success: true,
                cart: user.cart,
                cartDetail: []
              })
              }
            })
          }
        })
      }
    }
  )
})


router.get('/getHistory', auth, (req, res) => {
  User.findOne(
    {_id: req.user._id},
    (err, doc) => {
      let history = doc.history;
      if (err) return res.status(400).send(err)
      return res.status(200).json({success: true, history})
    }
  )
})


module.exports = router;

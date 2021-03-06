import axios from 'axios';
import {
    LOGIN_USER,
    REGISTER_USER,
    AUTH_USER,
    LOGOUT_USER, ADD_TO_CART_USER, REMOVE_CART_ITEM_USER, ON_SUCCESS_BUY_USER, GET_CART_ITEMS_USER,
} from './types';
import { USER_SERVER } from '../components/Config.js';

export function registerUser(dataToSubmit){
    const request = axios.post(`${USER_SERVER}/register`,dataToSubmit)
        .then(response => response.data);

    return {
        type: REGISTER_USER,
        payload: request
    }
}

export function loginUser(dataToSubmit){
    const request = axios.post(`${USER_SERVER}/login`,dataToSubmit)
                .then(response => response.data);

    return {
        type: LOGIN_USER,
        payload: request
    }
}

export function auth(){
    const request = axios.get(`${USER_SERVER}/auth`)
    .then(response => response.data);

    return {
        type: AUTH_USER,
        payload: request
    }
}

export function logoutUser(){
    const request = axios.get(`${USER_SERVER}/logout`)
    .then(response => response.data);

    return {
        type: LOGOUT_USER,
        payload: request
    }
}

/**
 * 장바구니 추가
 * @param _id
 * @returns {{payload: Promise<AxiosResponse<any>>, type: string}}
 */
export function addToCart(_id) {
    const request = axios.post(`${USER_SERVER}/addToCart?productId=${_id}`)
      .then(response => response.data);

    return {
        type: ADD_TO_CART_USER,
        payload: request
    }
}

/**
 * 장바구니 목록 가져오기
 * @param cartItems
 * @param userCart
 * @returns {{payload: Promise<AxiosResponse<any>>, type: string}}
 */
export function getCartItems(cartItems, userCart) {
    const request = axios.get(`/api/product/products_by_id?id=${cartItems}&type=array`)
      .then(response => {
          // cartItems들에 해당하는 정보들을 Product Collection 에서 가져온 후에
          // Quantity(수량) 정보를 넣어준다.
          userCart.forEach(cartItem => {
              response.data.forEach((productDetail, index) => {
                  if (cartItem.id === productDetail._id) {
                      response.data[index].quantity = cartItem.quantity;
                  }
              })
          })
          console.log(response.data)
          return response.data;
      });

    return {
        type: GET_CART_ITEMS_USER,
        payload: request
    }
}

/**
 * 장바구니 삭제
 * @param id
 * @returns {{payload: Promise<AxiosResponse<any>>, type: string}}
 */
export function removeCartItem(productId) {
    const request = axios.get(`/api/users/removeFromCart?_id=${productId}`)
      .then(response => {
          // productInfo, cart 정보를 조합해서 cartDetail 을 새로 만든다
          response.data.cart.forEach(item => {
              response.data.cartDetail.forEach((k, i) => {
                  if (item.id === k._id) {
                      response.data.cartDetail[i].quantity = item.quantity
                  }
              })
          })
          return response.data;
      });

    return {
        type: REMOVE_CART_ITEM_USER,
        payload: request
    }
}

/**
 * 페이팔 결제 성공시 처리 로직
 * @param data
 * @returns {{payload: Promise<AxiosResponse<any>>, type: string}}
 */
export function onSuccessBuy(data) {

    const request = axios.post(`${USER_SERVER}/successBuy`, data)
      .then(response => response.data);

    return {
        type: ON_SUCCESS_BUY_USER,
        payload: request
    }
}



/*
 * Base info for 2.x or 3.x REST. 
 * 
 * Autor: guolin.huang
 */

'use strict';

import axios from 'axios';
import { ota } from './util.js';
import { markAsLogined, clear } from './auth.js';


/* global setting */
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.post['Content-Type'] = 'application/json';

// inner define
const _isOTA3_x = (ota.getMajorVer() === 3);
const _isDevENV = process.env.NODE_ENV !== 'production';
function _authFail() {
    clear();
    window.location.href = '/';
}


// export define
function paramsPreproccess(params) {
    var { url, method = 'GET', data = {} } = params;

    url = REST_PREFIX + url;
    if (method == 'GET') {
        let pattern = /\?/;
        url += (pattern.test(url) ? '&' : '?') + '_now=' + Date.now();
    } 

    return { url, method, data };
}
function errHandle2x(error, reject, request = '') {
    if (axios.isCancel(error)) {
        _isDevENV && console.warn(`Request(${request}) canceled: ${error.message}`);
    } else {     
        const response = error.response;           
        const errCode = response.status;
        const errMsg = response.statusText;
        if (errCode == 401) return _authFail();
        reject(`${errCode}: ${errMsg}`);
    }
}
function errHandle3x(result, reject, request = '') {
    var res = false;
    if (result.ErrorCode === 1305) { // token expire or soon
        if (result.FieldValue) {
            markAsLogined(result.FieldValue);
            res = true;
        } else {
            _authFail();
        }
    } else {
        reject(result.ErrorCode);
        console.error(`Request(${request}) error: ${JSON.stringify(result)}`);
    }
    return res;
}
const REST_PREFIX = _isOTA3_x ? '/webresources' : '/RESTService/ota';
const AUTH_FIELD  = _isOTA3_x ? 'accesstoken' : 'Authorization';
const AUTH_PREFIX = _isOTA3_x ? 'AuthBytoken' : 'Bearer';
 
export { 
    axios as ajax, // function
    paramsPreproccess, // function
    errHandle2x, // function
    errHandle3x, // function
    REST_PREFIX, // var 
    AUTH_FIELD, // var
    AUTH_PREFIX, // var
};
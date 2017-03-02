'use strict';

import {convert} from '../../../js/util.js';
import {getAccessToken} from '../../../js/auth.js';
import {
    ajax,
    paramsPreproccess,
    errHandle3x,
    REST_PREFIX,
    AUTH_FIELD,
    AUTH_PREFIX,
} from '../../../js/_rest_base.js';

function ajaxBase([
    baseParams={url, method, data},
    timeout={server:0, client:0},
    cancelSource = null,
    printLog = false
]){
    const {url, method, data} = paramsPreproccess(baseParams);
    const headers = {
        [AUTH_FIELD]:`${AUTH_PREFIX} ${getAccessToken()}`,
        'Timeout': timeout.server
    }
    const request = `Request(URL: ${url}, Method: ${method},
                     Timeout: ${JSON.stringify(timeout)}, 
                     Data: ${JSON.stringify(data)})`;
                     
    let p = new Promise(function(resolve, reject){
        ajax({
            baseURL: 'http://localhost:8084/',
            method,
            url,
            data,
            headers,
            timeout: timeout.client,
            cancleToken: cancelSource && cancelSource.token
        }).then(
            response=>{
                if(response.data.result.ErrorCode){
                    errHandle3x(response.data.result, reject, request) &&
                    ajaxBase([baseParams, timeout, cancelSource, printLog]);
                } else {
                    resolve(response.data);
                }
            }
        ).catch(
            error=>reject(error)
        );  
    });
    return p;
};

export default ajaxBase;
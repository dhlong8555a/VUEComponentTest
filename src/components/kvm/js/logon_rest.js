'use strict';
import ajaxbase from "./ajax_base.js";
import {
    ajax,
    REST_PREFIX,
} from '../../../js/_rest_base.js';

class logonRest {
    static login(name, password) {
        const url = REST_PREFIX + '/AccountMgmt/loginforjwt';
        const data = {                               
                "request": {                    
                    "item": [                    
                        {                         
                            "@name": "username",   
                            "@value": name      
                        },                        
                        {                         
                            "@name": "password",   
                            "@value": password    
                        }                         
                    ]                            
                }                               
            };

        return new Promise((resolve, reject) => {
            ajax.post(url, data,  {baseURL: 'http://localhost:8084/'})
                .then( response => {
                    var res = 'User name or Password error!';                    
                    const ret = response.data.result;
                    if (ret.ErrorCode) {
                        reject(res);
                        return;
                    }

                    var rid;
                    switch(ret.role['@name']) {
                        case 'admin':           rid = 1; break;
                        case 'device admin':    rid = 2; break;
                        case 'guest':           rid = 3; break;
                    }
                    const ua = {
                        t: ret.role.accesstoken,
                        i: { 
                            r: rid,
                            a: ret.role.account['@id'],
                            n: name
                        }
                    };
                    resolve(ua); 
                })
                .catch( error => {
                    const errCode = error.response.status;
                    const errMsg = error.response.statusText;
                    var res = 'User name or Password error!';
                    if (errCode >= 500)
                        res = `Server side error (${errCode}: ${errMsg})`;
                    reject(res);
                });
        });
    }

    static logout(name) {
        const url = '/AccountMgmt/logout';
        const method = 'POST';
        const data = {
                "request": {
                    "item": {
                        "@name": "username",
                        "@value": name
                    }
                }
            };
        const params = [
                { url, method, data }, 
                { server: 0, client: 0 }, 
                null, 
                false
            ];

        return ajaxbase(params);
    }
}

export default logonRest;
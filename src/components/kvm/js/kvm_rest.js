'use strict';

import ajaxbase from "./ajax_base.js";

class kvmRest{
    static getKVMParams({agentId, mode}){
        const url = '/KVMMgmt';
        const method = 'POST';
        const data = {
            "request":{
                "item":[
                    {
                        "@name":"agentId",
                        "@value":agentId
                    },
                    {
                        "@name":"mode",
                        "@value":mode
                    }
                ]     
            }
        };
        const params = [
            {url, method, data},
            {server:0, client:0},
            null,
            false
        ];
        let p = new Promise(function(resolve, reject){
            ajaxbase(params).then(
                response=>{
                    console.log(response);
                    resolve(response);
                }
            ).catch(
                error=>{
                    console.log(error);
                    Promise.reject(error);
                }
            );
        });
        return p;
    }
}

export default kvmRest;
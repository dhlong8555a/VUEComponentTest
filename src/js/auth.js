/*
 * This file provide API for browser side 
 * auth check of remember me feature.
 * 
 * Autor: guolin.huang
 */
'use strict';

const rememberedKey = 'rua';
const sessionKey = 'ua';
const defaultExpires = 7 * 2; // two weeks

/* basic part: set & get & clear */
function clearSessionAuth() { sessionStorage.removeItem(sessionKey); }
function clearRememberedAuth() { localStorage.removeItem(rememberedKey); }
function setSessionAuth(v) { sessionStorage.setItem(sessionKey, JSON.stringify(v)); }
function setRememberedAuth(v) { localStorage.setItem(rememberedKey, JSON.stringify(v)); }
function getSessionAuth() { return JSON.parse(sessionStorage.getItem(sessionKey)); }
function getRememberedAuth() { return JSON.parse(localStorage.getItem(rememberedKey)); }
function getAccessToken() {    
    const ua = getSessionAuth();
    return ua && ua.t; 
}
function whoami() { 
    const ua = getSessionAuth();
    return ua && ua.i; 
}

/* login part */
function isLogined() { return getSessionAuth() || false; }
function markAsLogined(ua) { setSessionAuth(ua); }

/* remember part */
function isRemembered() {
    const rua = getRememberedAuth();
    if (!rua) return false;

    if (rua.dl > Date.now())
        return true;
    
    clearRememberedAuth();
    return false;
}

function rememberMe(ua, howLong = defaultExpires) {
    //             String  Number(unit: day)
    const expires = Date.now() + howLong * 24 * 60 * 60 * 1000;
    const rua = {
            ua: ua,
            dl: expires,
        }; 
    setRememberedAuth(rua);
}

/* clear all */
function clear() {
    clearSessionAuth();
    clearRememberedAuth();
}

export default {
    // basic part
    getRememberedAuth,
    getAccessToken,
    whoami,
    // login part 
    isLogined,
    markAsLogined,
    // remember part 
    isRemembered,
    rememberMe,
    // clear all 
    clear
};
export {
    // basic part
    getRememberedAuth,
    getAccessToken,
    whoami,
    // login part 
    isLogined,
    markAsLogined,
    // remember part 
    isRemembered,
    rememberMe,
    // clear all 
    clear
};
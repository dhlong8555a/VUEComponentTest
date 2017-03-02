/*
 * This is an collection of utility methods. 
 * 
 * Autor: guolin.huang
 */
'use strict';

import moment from 'moment';

class time {

    /* 
     * Convert timestamp to readable time string as your specified format.
     *
     * ms (Number)      : timestamp
     * format (String)  : time format (default is 'YYYY-MM-DD HH:mm:ss.SSS')
     */
    static ts2time(ms, format = 'YYYY-MM-DD HH:mm:ss.SSS') {
        return moment(ms).format(format);
    }
}

class convert {

    /* 
     * Capitalize the first letter. 
     *
     * str (String): input string
     */
    static capitalize(str) {
        var res = str.toString();
        return res.charAt(0).toUpperCase() + res.slice(1);
    }

    /* 
     * Convert number to ordinal string. 
     *
     * number (Number): input number( >= 0 and must be 'integer')
     */
    static number2ordinal(number) {
        var suffix = 'th';
        var strNum = number.toString();
        var lastNum = strNum.slice(strNum.length - 1);

        switch (lastNum) {
        case '1': suffix = 'st'; break;
        case '2': suffix = 'nd'; break;
        case '3': suffix = 'rd'; break;
        }
            
        return strNum + suffix; 
    } 
        
    /* 
     * Fills the input string with the specified string to the specified width. 
     *
     * str (String)         : input string
     * totalWidth (Number)  : total width after fill
     * filler (String)      : the string use to fill (space is default)
     * isSuffix (Boolean)   : suffix[true] or prefix[false] (true is default)
     */
    static fillStr(str, totalWidth, filler = ' ', isSuffix = true) {
        var res = str.toString();
        filler = filler.toString();
        while (res.length < totalWidth) {
            if (isSuffix) res.concat(filler);
            else res = filler + res;
        }
        return res;
    }

    /* 
     * Convert input number of bytes to human readable size, e.g: 1025 -> 1KB. 
     *
     * bytes (Number)       : number of bytes
     * abbreviate (Boolean) : unit use full name[e.g: KBytes] or abbr[e.g: KB], (false is default)
     */
    static bytes2readableSize(bytes, abbreviate = false) {        
        const full = ['Bytes', 'KBytes', 'MBytes', 'GBytes', 'TBytes'];
        const abbr = ['B', 'KB', 'MB', 'GB', 'TB'];
        const units = abbreviate ? abbr : full;

        var res = '';
        var approx = bytes;        
        var i = 0;
        for (; approx >= 1024; i++) {
            approx /= 1024;
        }
        res += approx.toFixed(0) + units[i];
        return res;
    }
}

class ota {

    /* 
     * Get OTA version.
     *
     */
    static getVersion() {
        return OTA_VERSION; // 'OTA_VERSION' is defined by 'webpack.DefinePlugin'.
    }

    /* 
     * Get OTA major version.
     *
     */
    static getMajorVer() {                
        const isOTA3_x = val => (/^3\..+/.test(val));
        const OTA_MAJOR_VER = isOTA3_x(this.getVersion()) ? 3 : 2; 
        return OTA_MAJOR_VER;
    }

    /* 
     * Compute the single page size depend on current browser inner height.
     *
     */
    static computePageSize() {
        const HEIGHT_LIST_ITEM = 40; // unit is px
        const SCALE = 1.5;
        const size = window.innerHeight * SCALE / HEIGHT_LIST_ITEM;
        return Math.floor(size);
    }

    /* 
     * Test the file is or not an OTA package file.
     *
     * file (File) : file object
     */
    static isOTAPkg(file) {
        return this.isOTAPkgName(file.name) && 
            !this.isOverLimitSize(file.size);
    }

    /* 
     * Test the file name is or not in line with OTA package specifications. 
     *
     * pkgName (Number) : file name
     */
    static isOTAPkgName(pkgName) {
        const pattern = /^\w+-v\d+(\.\d+){3}-[a-zA-Z\d]{32}\.zip$/;
        return pattern.test(pkgName);
    }

    /* 
     * Test whether the file size exceeds the OTA package limit. 
     *
     * size (Number) : file size in byte
     */
    static isOverLimitSize(size) {
        var res = false;
        if (size > 500 * 1024 * 1024) {
            res = true;
        }
        return res;
    } 
}



export default { time, convert, ota }
export { time, convert, ota }
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var ChCode;
(function (ChCode) {
    ChCode[ChCode["BOM"] = 65279] = "BOM";
    ChCode[ChCode["SPACE"] = 32] = "SPACE";
    ChCode[ChCode["TAB"] = 9] = "TAB";
    ChCode[ChCode["CARRIAGE_RETURN"] = 13] = "CARRIAGE_RETURN";
    ChCode[ChCode["LINE_FEED"] = 10] = "LINE_FEED";
    ChCode[ChCode["SLASH"] = 47] = "SLASH";
    ChCode[ChCode["LESS_THAN"] = 60] = "LESS_THAN";
    ChCode[ChCode["QUESTION_MARK"] = 63] = "QUESTION_MARK";
    ChCode[ChCode["EXCLAMATION_MARK"] = 33] = "EXCLAMATION_MARK";
})(ChCode || (ChCode = {}));
var State;
(function (State) {
    State[State["ROOT_STATE"] = 0] = "ROOT_STATE";
    State[State["DICT_STATE"] = 1] = "DICT_STATE";
    State[State["ARR_STATE"] = 2] = "ARR_STATE";
})(State || (State = {}));
/**
 * A very fast plist parser
 */
export function parse(content) {
    return _parse(content, null, null);
}
function _parse(content, filename, locationKeyName) {
    const len = content.length;
    let pos = 0;
    let line = 1;
    let char = 0;
    // Skip UTF8 BOM
    if (len > 0 && content.charCodeAt(0) === 65279 /* ChCode.BOM */) {
        pos = 1;
    }
    function advancePosBy(by) {
        if (locationKeyName === null) {
            pos = pos + by;
        }
        else {
            while (by > 0) {
                const chCode = content.charCodeAt(pos);
                if (chCode === 10 /* ChCode.LINE_FEED */) {
                    pos++;
                    line++;
                    char = 0;
                }
                else {
                    pos++;
                    char++;
                }
                by--;
            }
        }
    }
    function advancePosTo(to) {
        if (locationKeyName === null) {
            pos = to;
        }
        else {
            advancePosBy(to - pos);
        }
    }
    function skipWhitespace() {
        while (pos < len) {
            const chCode = content.charCodeAt(pos);
            if (chCode !== 32 /* ChCode.SPACE */ &&
                chCode !== 9 /* ChCode.TAB */ &&
                chCode !== 13 /* ChCode.CARRIAGE_RETURN */ &&
                chCode !== 10 /* ChCode.LINE_FEED */) {
                break;
            }
            advancePosBy(1);
        }
    }
    function advanceIfStartsWith(str) {
        if (content.substr(pos, str.length) === str) {
            advancePosBy(str.length);
            return true;
        }
        return false;
    }
    function advanceUntil(str) {
        const nextOccurence = content.indexOf(str, pos);
        if (nextOccurence !== -1) {
            advancePosTo(nextOccurence + str.length);
        }
        else {
            // EOF
            advancePosTo(len);
        }
    }
    function captureUntil(str) {
        const nextOccurence = content.indexOf(str, pos);
        if (nextOccurence !== -1) {
            const r = content.substring(pos, nextOccurence);
            advancePosTo(nextOccurence + str.length);
            return r;
        }
        else {
            // EOF
            const r = content.substr(pos);
            advancePosTo(len);
            return r;
        }
    }
    let state = 0 /* State.ROOT_STATE */;
    let cur = null;
    const stateStack = [];
    const objStack = [];
    let curKey = null;
    function pushState(newState, newCur) {
        stateStack.push(state);
        objStack.push(cur);
        state = newState;
        cur = newCur;
    }
    function popState() {
        if (stateStack.length === 0) {
            return fail('illegal state stack');
        }
        state = stateStack.pop();
        cur = objStack.pop();
    }
    function fail(msg) {
        throw new Error('Near offset ' + pos + ': ' + msg + ' ~~~' + content.substr(pos, 50) + '~~~');
    }
    const dictState = {
        enterDict: function () {
            if (curKey === null) {
                return fail('missing <key>');
            }
            const newDict = {};
            if (locationKeyName !== null) {
                newDict[locationKeyName] = {
                    filename: filename,
                    line: line,
                    char: char,
                };
            }
            cur[curKey] = newDict;
            curKey = null;
            pushState(1 /* State.DICT_STATE */, newDict);
        },
        enterArray: function () {
            if (curKey === null) {
                return fail('missing <key>');
            }
            const newArr = [];
            cur[curKey] = newArr;
            curKey = null;
            pushState(2 /* State.ARR_STATE */, newArr);
        },
    };
    const arrState = {
        enterDict: function () {
            const newDict = {};
            if (locationKeyName !== null) {
                newDict[locationKeyName] = {
                    filename: filename,
                    line: line,
                    char: char,
                };
            }
            cur.push(newDict);
            pushState(1 /* State.DICT_STATE */, newDict);
        },
        enterArray: function () {
            const newArr = [];
            cur.push(newArr);
            pushState(2 /* State.ARR_STATE */, newArr);
        },
    };
    function enterDict() {
        if (state === 1 /* State.DICT_STATE */) {
            dictState.enterDict();
        }
        else if (state === 2 /* State.ARR_STATE */) {
            arrState.enterDict();
        }
        else {
            // ROOT_STATE
            cur = {};
            if (locationKeyName !== null) {
                cur[locationKeyName] = {
                    filename: filename,
                    line: line,
                    char: char,
                };
            }
            pushState(1 /* State.DICT_STATE */, cur);
        }
    }
    function leaveDict() {
        if (state === 1 /* State.DICT_STATE */) {
            popState();
        }
        else if (state === 2 /* State.ARR_STATE */) {
            return fail('unexpected </dict>');
        }
        else {
            // ROOT_STATE
            return fail('unexpected </dict>');
        }
    }
    function enterArray() {
        if (state === 1 /* State.DICT_STATE */) {
            dictState.enterArray();
        }
        else if (state === 2 /* State.ARR_STATE */) {
            arrState.enterArray();
        }
        else {
            // ROOT_STATE
            cur = [];
            pushState(2 /* State.ARR_STATE */, cur);
        }
    }
    function leaveArray() {
        if (state === 1 /* State.DICT_STATE */) {
            return fail('unexpected </array>');
        }
        else if (state === 2 /* State.ARR_STATE */) {
            popState();
        }
        else {
            // ROOT_STATE
            return fail('unexpected </array>');
        }
    }
    function acceptKey(val) {
        if (state === 1 /* State.DICT_STATE */) {
            if (curKey !== null) {
                return fail('too many <key>');
            }
            curKey = val;
        }
        else if (state === 2 /* State.ARR_STATE */) {
            return fail('unexpected <key>');
        }
        else {
            // ROOT_STATE
            return fail('unexpected <key>');
        }
    }
    function acceptString(val) {
        if (state === 1 /* State.DICT_STATE */) {
            if (curKey === null) {
                return fail('missing <key>');
            }
            cur[curKey] = val;
            curKey = null;
        }
        else if (state === 2 /* State.ARR_STATE */) {
            cur.push(val);
        }
        else {
            // ROOT_STATE
            cur = val;
        }
    }
    function acceptReal(val) {
        if (isNaN(val)) {
            return fail('cannot parse float');
        }
        if (state === 1 /* State.DICT_STATE */) {
            if (curKey === null) {
                return fail('missing <key>');
            }
            cur[curKey] = val;
            curKey = null;
        }
        else if (state === 2 /* State.ARR_STATE */) {
            cur.push(val);
        }
        else {
            // ROOT_STATE
            cur = val;
        }
    }
    function acceptInteger(val) {
        if (isNaN(val)) {
            return fail('cannot parse integer');
        }
        if (state === 1 /* State.DICT_STATE */) {
            if (curKey === null) {
                return fail('missing <key>');
            }
            cur[curKey] = val;
            curKey = null;
        }
        else if (state === 2 /* State.ARR_STATE */) {
            cur.push(val);
        }
        else {
            // ROOT_STATE
            cur = val;
        }
    }
    function acceptDate(val) {
        if (state === 1 /* State.DICT_STATE */) {
            if (curKey === null) {
                return fail('missing <key>');
            }
            cur[curKey] = val;
            curKey = null;
        }
        else if (state === 2 /* State.ARR_STATE */) {
            cur.push(val);
        }
        else {
            // ROOT_STATE
            cur = val;
        }
    }
    function acceptData(val) {
        if (state === 1 /* State.DICT_STATE */) {
            if (curKey === null) {
                return fail('missing <key>');
            }
            cur[curKey] = val;
            curKey = null;
        }
        else if (state === 2 /* State.ARR_STATE */) {
            cur.push(val);
        }
        else {
            // ROOT_STATE
            cur = val;
        }
    }
    function acceptBool(val) {
        if (state === 1 /* State.DICT_STATE */) {
            if (curKey === null) {
                return fail('missing <key>');
            }
            cur[curKey] = val;
            curKey = null;
        }
        else if (state === 2 /* State.ARR_STATE */) {
            cur.push(val);
        }
        else {
            // ROOT_STATE
            cur = val;
        }
    }
    function escapeVal(str) {
        return str
            .replace(/&#([0-9]+);/g, function (_, m0) {
            return String.fromCodePoint(parseInt(m0, 10));
        })
            .replace(/&#x([0-9a-f]+);/g, function (_, m0) {
            return String.fromCodePoint(parseInt(m0, 16));
        })
            .replace(/&amp;|&lt;|&gt;|&quot;|&apos;/g, function (_) {
            switch (_) {
                case '&amp;':
                    return '&';
                case '&lt;':
                    return '<';
                case '&gt;':
                    return '>';
                case '&quot;':
                    return '"';
                case '&apos;':
                    return "'";
            }
            return _;
        });
    }
    function parseOpenTag() {
        let r = captureUntil('>');
        let isClosed = false;
        if (r.charCodeAt(r.length - 1) === 47 /* ChCode.SLASH */) {
            isClosed = true;
            r = r.substring(0, r.length - 1);
        }
        return {
            name: r.trim(),
            isClosed: isClosed,
        };
    }
    function parseTagValue(tag) {
        if (tag.isClosed) {
            return '';
        }
        const val = captureUntil('</');
        advanceUntil('>');
        return escapeVal(val);
    }
    while (pos < len) {
        skipWhitespace();
        if (pos >= len) {
            break;
        }
        const chCode = content.charCodeAt(pos);
        advancePosBy(1);
        if (chCode !== 60 /* ChCode.LESS_THAN */) {
            return fail('expected <');
        }
        if (pos >= len) {
            return fail('unexpected end of input');
        }
        const peekChCode = content.charCodeAt(pos);
        if (peekChCode === 63 /* ChCode.QUESTION_MARK */) {
            advancePosBy(1);
            advanceUntil('?>');
            continue;
        }
        if (peekChCode === 33 /* ChCode.EXCLAMATION_MARK */) {
            advancePosBy(1);
            if (advanceIfStartsWith('--')) {
                advanceUntil('-->');
                continue;
            }
            advanceUntil('>');
            continue;
        }
        if (peekChCode === 47 /* ChCode.SLASH */) {
            advancePosBy(1);
            skipWhitespace();
            if (advanceIfStartsWith('plist')) {
                advanceUntil('>');
                continue;
            }
            if (advanceIfStartsWith('dict')) {
                advanceUntil('>');
                leaveDict();
                continue;
            }
            if (advanceIfStartsWith('array')) {
                advanceUntil('>');
                leaveArray();
                continue;
            }
            return fail('unexpected closed tag');
        }
        const tag = parseOpenTag();
        switch (tag.name) {
            case 'dict':
                enterDict();
                if (tag.isClosed) {
                    leaveDict();
                }
                continue;
            case 'array':
                enterArray();
                if (tag.isClosed) {
                    leaveArray();
                }
                continue;
            case 'key':
                acceptKey(parseTagValue(tag));
                continue;
            case 'string':
                acceptString(parseTagValue(tag));
                continue;
            case 'real':
                acceptReal(parseFloat(parseTagValue(tag)));
                continue;
            case 'integer':
                acceptInteger(parseInt(parseTagValue(tag), 10));
                continue;
            case 'date':
                acceptDate(new Date(parseTagValue(tag)));
                continue;
            case 'data':
                acceptData(parseTagValue(tag));
                continue;
            case 'true':
                parseTagValue(tag);
                acceptBool(true);
                continue;
            case 'false':
                parseTagValue(tag);
                acceptBool(false);
                continue;
        }
        if (/^plist/.test(tag.name)) {
            continue;
        }
        return fail('unexpected opened tag ' + tag.name);
    }
    return cur;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxpc3RQYXJzZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2NvbW1vbi9wbGlzdFBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxJQUFXLE1BYVY7QUFiRCxXQUFXLE1BQU07SUFDaEIscUNBQVcsQ0FBQTtJQUVYLHNDQUFVLENBQUE7SUFDVixpQ0FBTyxDQUFBO0lBQ1AsMERBQW9CLENBQUE7SUFDcEIsOENBQWMsQ0FBQTtJQUVkLHNDQUFVLENBQUE7SUFFViw4Q0FBYyxDQUFBO0lBQ2Qsc0RBQWtCLENBQUE7SUFDbEIsNERBQXFCLENBQUE7QUFDdEIsQ0FBQyxFQWJVLE1BQU0sS0FBTixNQUFNLFFBYWhCO0FBRUQsSUFBVyxLQUlWO0FBSkQsV0FBVyxLQUFLO0lBQ2YsNkNBQWMsQ0FBQTtJQUNkLDZDQUFjLENBQUE7SUFDZCwyQ0FBYSxDQUFBO0FBQ2QsQ0FBQyxFQUpVLEtBQUssS0FBTCxLQUFLLFFBSWY7QUFDRDs7R0FFRztBQUNILE1BQU0sVUFBVSxLQUFLLENBQUMsT0FBZTtJQUNwQyxPQUFPLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO0FBQ25DLENBQUM7QUFFRCxTQUFTLE1BQU0sQ0FBQyxPQUFlLEVBQUUsUUFBdUIsRUFBRSxlQUE4QjtJQUN2RixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFBO0lBRTFCLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQTtJQUNYLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQTtJQUNaLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQTtJQUVaLGdCQUFnQjtJQUNoQixJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsMkJBQWUsRUFB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
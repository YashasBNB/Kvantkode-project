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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxpc3RQYXJzZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aGVtZXMvY29tbW9uL3BsaXN0UGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLElBQVcsTUFhVjtBQWJELFdBQVcsTUFBTTtJQUNoQixxQ0FBVyxDQUFBO0lBRVgsc0NBQVUsQ0FBQTtJQUNWLGlDQUFPLENBQUE7SUFDUCwwREFBb0IsQ0FBQTtJQUNwQiw4Q0FBYyxDQUFBO0lBRWQsc0NBQVUsQ0FBQTtJQUVWLDhDQUFjLENBQUE7SUFDZCxzREFBa0IsQ0FBQTtJQUNsQiw0REFBcUIsQ0FBQTtBQUN0QixDQUFDLEVBYlUsTUFBTSxLQUFOLE1BQU0sUUFhaEI7QUFFRCxJQUFXLEtBSVY7QUFKRCxXQUFXLEtBQUs7SUFDZiw2Q0FBYyxDQUFBO0lBQ2QsNkNBQWMsQ0FBQTtJQUNkLDJDQUFhLENBQUE7QUFDZCxDQUFDLEVBSlUsS0FBSyxLQUFMLEtBQUssUUFJZjtBQUNEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLEtBQUssQ0FBQyxPQUFlO0lBQ3BDLE9BQU8sTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7QUFDbkMsQ0FBQztBQUVELFNBQVMsTUFBTSxDQUFDLE9BQWUsRUFBRSxRQUF1QixFQUFFLGVBQThCO0lBQ3ZGLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUE7SUFFMUIsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFBO0lBQ1gsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFBO0lBQ1osSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFBO0lBRVosZ0JBQWdCO0lBQ2hCLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQywyQkFB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
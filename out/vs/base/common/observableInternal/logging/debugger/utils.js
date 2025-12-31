/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function getFirstStackFrameOutsideOf(stack, pattern) {
    const lines = stack.split('\n');
    let i = -1;
    for (const line of lines.slice(1)) {
        i++;
        if (pattern && pattern.test(line)) {
            continue;
        }
        const result = parseLine(line);
        if (result) {
            return result;
        }
    }
    return undefined;
}
function parseLine(stackLine) {
    const match = stackLine.match(/\((.*):(\d+):(\d+)\)/);
    if (match) {
        return {
            fileName: match[1],
            line: parseInt(match[2]),
            column: parseInt(match[3]),
            id: stackLine,
        };
    }
    const match2 = stackLine.match(/at ([^\(\)]*):(\d+):(\d+)/);
    if (match2) {
        return {
            fileName: match2[1],
            line: parseInt(match2[2]),
            column: parseInt(match2[3]),
            id: stackLine,
        };
    }
    return undefined;
}
export class Debouncer {
    constructor() {
        this._timeout = undefined;
    }
    debounce(fn, timeoutMs) {
        if (this._timeout !== undefined) {
            clearTimeout(this._timeout);
        }
        this._timeout = setTimeout(() => {
            this._timeout = undefined;
            fn();
        }, timeoutMs);
    }
    dispose() {
        if (this._timeout !== undefined) {
            clearTimeout(this._timeout);
        }
    }
}
export class Throttler {
    constructor() {
        this._timeout = undefined;
    }
    throttle(fn, timeoutMs) {
        if (this._timeout === undefined) {
            this._timeout = setTimeout(() => {
                this._timeout = undefined;
                fn();
            }, timeoutMs);
        }
    }
    dispose() {
        if (this._timeout !== undefined) {
            clearTimeout(this._timeout);
        }
    }
}
export function deepAssign(target, source) {
    for (const key in source) {
        if (!!target[key] &&
            typeof target[key] === 'object' &&
            !!source[key] &&
            typeof source[key] === 'object') {
            deepAssign(target[key], source[key]);
        }
        else {
            target[key] = source[key];
        }
    }
}
export function deepAssignDeleteNulls(target, source) {
    for (const key in source) {
        if (source[key] === null) {
            delete target[key];
        }
        else if (!!target[key] &&
            typeof target[key] === 'object' &&
            !!source[key] &&
            typeof source[key] === 'object') {
            deepAssignDeleteNulls(target[key], source[key]);
        }
        else {
            target[key] = source[key];
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvbG9nZ2luZy9kZWJ1Z2dlci91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxNQUFNLFVBQVUsMkJBQTJCLENBQzFDLEtBQWEsRUFDYixPQUFnQjtJQUVoQixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQy9CLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ1YsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDbkMsQ0FBQyxFQUFFLENBQUE7UUFFSCxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDbkMsU0FBUTtRQUNULENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDOUIsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU8sTUFBTSxDQUFBO1FBQ2QsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLFNBQVMsQ0FBQTtBQUNqQixDQUFDO0FBU0QsU0FBUyxTQUFTLENBQUMsU0FBaUI7SUFDbkMsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO0lBQ3JELElBQUksS0FBSyxFQUFFLENBQUM7UUFDWCxPQUFPO1lBQ04sUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDbEIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsTUFBTSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFD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
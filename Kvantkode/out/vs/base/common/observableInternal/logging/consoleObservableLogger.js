/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Derived } from '../derived.js';
import { addLogger } from './logging.js';
import { getClassName } from '../debugName.js';
let consoleObservableLogger;
export function logObservableToConsole(obs) {
    if (!consoleObservableLogger) {
        consoleObservableLogger = new ConsoleObservableLogger();
        addLogger(consoleObservableLogger);
    }
    consoleObservableLogger.addFilteredObj(obs);
}
export class ConsoleObservableLogger {
    constructor() {
        this.indentation = 0;
        this.changedObservablesSets = new WeakMap();
    }
    addFilteredObj(obj) {
        if (!this._filteredObjects) {
            this._filteredObjects = new Set();
        }
        this._filteredObjects.add(obj);
    }
    _isIncluded(obj) {
        return this._filteredObjects?.has(obj) ?? true;
    }
    textToConsoleArgs(text) {
        return consoleTextToArgs([normalText(repeat('|  ', this.indentation)), text]);
    }
    formatInfo(info) {
        if (!info.hadValue) {
            return [
                normalText(` `),
                styled(formatValue(info.newValue, 60), {
                    color: 'green',
                }),
                normalText(` (initial)`),
            ];
        }
        return info.didChange
            ? [
                normalText(` `),
                styled(formatValue(info.oldValue, 70), {
                    color: 'red',
                    strikeThrough: true,
                }),
                normalText(` `),
                styled(formatValue(info.newValue, 60), {
                    color: 'green',
                }),
            ]
            : [normalText(` (unchanged)`)];
    }
    handleObservableCreated(observable) {
        if (observable instanceof Derived) {
            const derived = observable;
            this.changedObservablesSets.set(derived, new Set());
            const debugTrackUpdating = false;
            if (debugTrackUpdating) {
                const updating = [];
                derived.__debugUpdating = updating;
                const existingBeginUpdate = derived.beginUpdate;
                derived.beginUpdate = (obs) => {
                    updating.push(obs);
                    return existingBeginUpdate.apply(derived, [obs]);
                };
                const existingEndUpdate = derived.endUpdate;
                derived.endUpdate = (obs) => {
                    const idx = updating.indexOf(obs);
                    if (idx === -1) {
                        console.error('endUpdate called without beginUpdate', derived.debugName, obs.debugName);
                    }
                    updating.splice(idx, 1);
                    return existingEndUpdate.apply(derived, [obs]);
                };
            }
        }
    }
    handleOnListenerCountChanged(observable, newCount) { }
    handleObservableUpdated(observable, info) {
        if (!this._isIncluded(observable)) {
            return;
        }
        if (observable instanceof Derived) {
            this._handleDerivedRecomputed(observable, info);
            return;
        }
        console.log(...this.textToConsoleArgs([
            formatKind('observable value changed'),
            styled(observable.debugName, { color: 'BlueViolet' }),
            ...this.formatInfo(info),
        ]));
    }
    formatChanges(changes) {
        if (changes.size === 0) {
            return undefined;
        }
        return styled(' (changed deps: ' + [...changes].map((o) => o.debugName).join(', ') + ')', {
            color: 'gray',
        });
    }
    handleDerivedDependencyChanged(derived, observable, change) {
        if (!this._isIncluded(derived)) {
            return;
        }
        this.changedObservablesSets.get(derived)?.add(observable);
    }
    _handleDerivedRecomputed(derived, info) {
        if (!this._isIncluded(derived)) {
            return;
        }
        const changedObservables = this.changedObservablesSets.get(derived);
        if (!changedObservables) {
            return;
        }
        console.log(...this.textToConsoleArgs([
            formatKind('derived recomputed'),
            styled(derived.debugName, { color: 'BlueViolet' }),
            ...this.formatInfo(info),
            this.formatChanges(changedObservables),
            { data: [{ fn: derived._debugNameData.referenceFn ?? derived._computeFn }] },
        ]));
        changedObservables.clear();
    }
    handleDerivedCleared(derived) {
        if (!this._isIncluded(derived)) {
            return;
        }
        console.log(...this.textToConsoleArgs([
            formatKind('derived cleared'),
            styled(derived.debugName, { color: 'BlueViolet' }),
        ]));
    }
    handleFromEventObservableTriggered(observable, info) {
        if (!this._isIncluded(observable)) {
            return;
        }
        console.log(...this.textToConsoleArgs([
            formatKind('observable from event triggered'),
            styled(observable.debugName, { color: 'BlueViolet' }),
            ...this.formatInfo(info),
            { data: [{ fn: observable._getValue }] },
        ]));
    }
    handleAutorunCreated(autorun) {
        if (!this._isIncluded(autorun)) {
            return;
        }
        this.changedObservablesSets.set(autorun, new Set());
    }
    handleAutorunDisposed(autorun) { }
    handleAutorunDependencyChanged(autorun, observable, change) {
        if (!this._isIncluded(autorun)) {
            return;
        }
        this.changedObservablesSets.get(autorun).add(observable);
    }
    handleAutorunStarted(autorun) {
        const changedObservables = this.changedObservablesSets.get(autorun);
        if (!changedObservables) {
            return;
        }
        if (this._isIncluded(autorun)) {
            console.log(...this.textToConsoleArgs([
                formatKind('autorun'),
                styled(autorun.debugName, { color: 'BlueViolet' }),
                this.formatChanges(changedObservables),
                { data: [{ fn: autorun._debugNameData.referenceFn ?? autorun._runFn }] },
            ]));
        }
        changedObservables.clear();
        this.indentation++;
    }
    handleAutorunFinished(autorun) {
        this.indentation--;
    }
    handleBeginTransaction(transaction) {
        let transactionName = transaction.getDebugName();
        if (transactionName === undefined) {
            transactionName = '';
        }
        if (this._isIncluded(transaction)) {
            console.log(...this.textToConsoleArgs([
                formatKind('transaction'),
                styled(transactionName, { color: 'BlueViolet' }),
                { data: [{ fn: transaction._fn }] },
            ]));
        }
        this.indentation++;
    }
    handleEndTransaction() {
        this.indentation--;
    }
}
function consoleTextToArgs(text) {
    const styles = new Array();
    const data = [];
    let firstArg = '';
    function process(t) {
        if ('length' in t) {
            for (const item of t) {
                if (item) {
                    process(item);
                }
            }
        }
        else if ('text' in t) {
            firstArg += `%c${t.text}`;
            styles.push(t.style);
            if (t.data) {
                data.push(...t.data);
            }
        }
        else if ('data' in t) {
            data.push(...t.data);
        }
    }
    process(text);
    const result = [firstArg, ...styles];
    result.push(...data);
    return result;
}
function normalText(text) {
    return styled(text, { color: 'black' });
}
function formatKind(kind) {
    return styled(padStr(`${kind}: `, 10), { color: 'black', bold: true });
}
function styled(text, options = {
    color: 'black',
}) {
    function objToCss(styleObj) {
        return Object.entries(styleObj).reduce((styleString, [propName, propValue]) => {
            return `${styleString}${propName}:${propValue};`;
        }, '');
    }
    const style = {
        color: options.color,
    };
    if (options.strikeThrough) {
        style['text-decoration'] = 'line-through';
    }
    if (options.bold) {
        style['font-weight'] = 'bold';
    }
    return {
        text,
        style: objToCss(style),
    };
}
export function formatValue(value, availableLen) {
    switch (typeof value) {
        case 'number':
            return '' + value;
        case 'string':
            if (value.length + 2 <= availableLen) {
                return `"${value}"`;
            }
            return `"${value.substr(0, availableLen - 7)}"+...`;
        case 'boolean':
            return value ? 'true' : 'false';
        case 'undefined':
            return 'undefined';
        case 'object':
            if (value === null) {
                return 'null';
            }
            if (Array.isArray(value)) {
                return formatArray(value, availableLen);
            }
            return formatObject(value, availableLen);
        case 'symbol':
            return value.toString();
        case 'function':
            return `[[Function${value.name ? ' ' + value.name : ''}]]`;
        default:
            return '' + value;
    }
}
function formatArray(value, availableLen) {
    let result = '[ ';
    let first = true;
    for (const val of value) {
        if (!first) {
            result += ', ';
        }
        if (result.length - 5 > availableLen) {
            result += '...';
            break;
        }
        first = false;
        result += `${formatValue(val, availableLen - result.length)}`;
    }
    result += ' ]';
    return result;
}
function formatObject(value, availableLen) {
    if (typeof value.toString === 'function' && value.toString !== Object.prototype.toString) {
        const val = value.toString();
        if (val.length <= availableLen) {
            return val;
        }
        return val.substring(0, availableLen - 3) + '...';
    }
    const className = getClassName(value);
    let result = className ? className + '(' : '{ ';
    let first = true;
    for (const [key, val] of Object.entries(value)) {
        if (!first) {
            result += ', ';
        }
        if (result.length - 5 > availableLen) {
            result += '...';
            break;
        }
        first = false;
        result += `${key}: ${formatValue(val, availableLen - result.length)}`;
    }
    result += className ? ')' : ' }';
    return result;
}
function repeat(str, count) {
    let result = '';
    for (let i = 1; i <= count; i++) {
        result += str;
    }
    return result;
}
function padStr(str, length) {
    while (str.length < length) {
        str += ' ';
    }
    return str;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc29sZU9ic2VydmFibGVMb2dnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC9sb2dnaW5nL2NvbnNvbGVPYnNlcnZhYmxlTG9nZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDdkMsT0FBTyxFQUF5QyxTQUFTLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFFL0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTlDLElBQUksdUJBQTRELENBQUE7QUFFaEUsTUFBTSxVQUFVLHNCQUFzQixDQUFDLEdBQXFCO0lBQzNELElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1FBQzlCLHVCQUF1QixHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQTtRQUN2RCxTQUFTLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBQ0QsdUJBQXVCLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0FBQzVDLENBQUM7QUFFRCxNQUFNLE9BQU8sdUJBQXVCO0lBQXBDO1FBQ1MsZ0JBQVcsR0FBRyxDQUFDLENBQUE7UUE2Rk4sMkJBQXNCLEdBQUcsSUFBSSxPQUFPLEVBQWlDLENBQUE7SUE2SXZGLENBQUM7SUF0T08sY0FBYyxDQUFDLEdBQVk7UUFDakMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFBO1FBQ2xDLENBQUM7UUFDRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQy9CLENBQUM7SUFFTyxXQUFXLENBQUMsR0FBWTtR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
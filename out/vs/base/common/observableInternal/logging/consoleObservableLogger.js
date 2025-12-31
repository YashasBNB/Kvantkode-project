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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc29sZU9ic2VydmFibGVMb2dnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvbG9nZ2luZy9jb25zb2xlT2JzZXJ2YWJsZUxvZ2dlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ3ZDLE9BQU8sRUFBeUMsU0FBUyxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBRS9FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUU5QyxJQUFJLHVCQUE0RCxDQUFBO0FBRWhFLE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxHQUFxQjtJQUMzRCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUM5Qix1QkFBdUIsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUE7UUFDdkQsU0FBUyxDQUFDLHVCQUF1QixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUNELHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUM1QyxDQUFDO0FBRUQsTUFBTSxPQUFPLHVCQUF1QjtJQUFwQztRQUNTLGdCQUFXLEdBQUcsQ0FBQyxDQUFBO1FBNkZOLDJCQUFzQixHQUFHLElBQUksT0FBTyxFQUFpQyxDQUFBO0lBNkl2RixDQUFDO0lBdE9PLGNBQWMsQ0FBQyxHQUFZO1FBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUNsQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUMvQixDQUFDO0lBRU8sV0FBVyxDQUFDLEdBQVk7UUFDL0IsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQTtJQUMvQyxDQUFDO0lBRU8saUJBQWlCLENBQUMsSUFBaUI7UUFDMUMsT0FBTyxpQkFBaUIsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDOUUsQ0FBQztJQUVPLFVBQVUsQ0FBQyxJQUF3QjtRQUMxQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BCLE9BQU87Z0JBQ04sVUFBVSxDQUFDLEdBQUcsQ0FBQztnQkFDZixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUU7b0JBQ3RDLEtBQUssRUFBRSxPQUFPO2lCQUNkLENBQUM7Z0JBQ0YsVUFBVSxDQUFDLFlBQVksQ0FBQzthQUN4QixDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFNBQVM7WUFDcEIsQ0FBQyxDQUFDO2dCQUNBLFVBQVUsQ0FBQyxHQUFHLENBQUM7Z0JBQ2YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFO29CQUN0QyxLQUFLLEVBQUUsS0FBSztvQkFDWixhQUFhLEVBQUUsSUFBSTtpQkFDbkIsQ0FBQztnQkFDRixVQUFVLENBQUMsR0FBRyxDQUFDO2dCQUNmLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRTtvQkFDdEMsS0FBSyxFQUFFLE9BQU87aUJBQ2QsQ0FBQzthQUNGO1lBQ0YsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUE7SUFDaEMsQ0FBQztJQUVELHVCQUF1QixDQUFDLFVBQTRCO1FBQ25ELElBQUksVUFBVSxZQUFZLE9BQU8sRUFBRSxDQUFDO1lBQ25DLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQTtZQUMxQixJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUE7WUFFbkQsTUFBTSxrQkFBa0IsR0FBRyxLQUFLLENBQUE7WUFDaEMsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO2dCQUN4QixNQUFNLFFBQVEsR0FBdUIsRUFBRSxDQUN0QztnQkFBQyxPQUFlLENBQUMsZUFBZSxHQUFHLFFBQVEsQ0FBQTtnQkFFNUMsTUFBTSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFBO2dCQUMvQyxPQUFPLENBQUMsV0FBVyxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUU7b0JBQzdCLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7b0JBQ2xCLE9BQU8sbUJBQW1CLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQ2pELENBQUMsQ0FBQTtnQkFFRCxNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUE7Z0JBQzNDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRTtvQkFDM0IsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDakMsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDaEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxzQ0FBc0MsRUFBRSxPQUFPLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtvQkFDeEYsQ0FBQztvQkFDRCxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtvQkFDdkIsT0FBTyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDL0MsQ0FBQyxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsNEJBQTRCLENBQUMsVUFBNEIsRUFBRSxRQUFnQixJQUFTLENBQUM7SUFFckYsdUJBQXVCLENBQUMsVUFBZ0MsRUFBRSxJQUF3QjtRQUNqRixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ25DLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxVQUFVLFlBQVksT0FBTyxFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUMvQyxPQUFNO1FBQ1AsQ0FBQztRQUVELE9BQU8sQ0FBQyxHQUFHLENBQ1YsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUM7WUFDekIsVUFBVSxDQUFDLDBCQUEwQixDQUFDO1lBQ3RDLE1BQU0sQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxDQUFDO1lBQ3JELEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7U0FDeEIsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBSUQsYUFBYSxDQUFDLE9BQThCO1FBQzNDLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN4QixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUU7WUFDekYsS0FBSyxFQUFFLE1BQU07U0FDYixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsOEJBQThCLENBQzdCLE9BQXFCLEVBQ3JCLFVBQTRCLEVBQzVCLE1BQWU7UUFFZixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2hDLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUVELHdCQUF3QixDQUFDLE9BQXlCLEVBQUUsSUFBd0I7UUFDM0UsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNoQyxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNuRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUN6QixPQUFNO1FBQ1AsQ0FBQztRQUNELE9BQU8sQ0FBQyxHQUFHLENBQ1YsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUM7WUFDekIsVUFBVSxDQUFDLG9CQUFvQixDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxDQUFDO1lBQ2xELEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDeEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQztZQUN0QyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxjQUFjLENBQUMsV0FBVyxJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFO1NBQzVFLENBQUMsQ0FDRixDQUFBO1FBQ0Qsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDM0IsQ0FBQztJQUVELG9CQUFvQixDQUFDLE9BQXlCO1FBQzdDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDaEMsT0FBTTtRQUNQLENBQUM7UUFFRCxPQUFPLENBQUMsR0FBRyxDQUNWLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDO1lBQ3pCLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQztZQUM3QixNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsQ0FBQztTQUNsRCxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxrQ0FBa0MsQ0FDakMsVUFBeUMsRUFDekMsSUFBd0I7UUFFeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNuQyxPQUFNO1FBQ1AsQ0FBQztRQUVELE9BQU8sQ0FBQyxHQUFHLENBQ1YsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUM7WUFDekIsVUFBVSxDQUFDLGlDQUFpQyxDQUFDO1lBQzdDLE1BQU0sQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxDQUFDO1lBQ3JELEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDeEIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRTtTQUN4QyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxPQUF3QjtRQUM1QyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2hDLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFBO0lBQ3BELENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxPQUF3QixJQUFTLENBQUM7SUFFeEQsOEJBQThCLENBQzdCLE9BQXdCLEVBQ3hCLFVBQTRCLEVBQzVCLE1BQWU7UUFFZixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2hDLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUVELG9CQUFvQixDQUFDLE9BQXdCO1FBQzVDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNuRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUN6QixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQy9CLE9BQU8sQ0FBQyxHQUFHLENBQ1YsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUM7Z0JBQ3pCLFVBQVUsQ0FBQyxTQUFTLENBQUM7Z0JBQ3JCLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxDQUFDO2dCQUNsRCxJQUFJLENBQUMsYUFBYSxDQUFDLGtCQUFrQixDQUFDO2dCQUN0QyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxjQUFjLENBQUMsV0FBVyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFO2FBQ3hFLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQztRQUNELGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQzFCLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtJQUNuQixDQUFDO0lBRUQscUJBQXFCLENBQUMsT0FBd0I7UUFDN0MsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO0lBQ25CLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxXQUE0QjtRQUNsRCxJQUFJLGVBQWUsR0FBRyxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDaEQsSUFBSSxlQUFlLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbkMsZUFBZSxHQUFHLEVBQUUsQ0FBQTtRQUNyQixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDbkMsT0FBTyxDQUFDLEdBQUcsQ0FDVixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztnQkFDekIsVUFBVSxDQUFDLGFBQWEsQ0FBQztnQkFDekIsTUFBTSxDQUFDLGVBQWUsRUFBRSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsQ0FBQztnQkFDaEQsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRTthQUNuQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7SUFDbkIsQ0FBQztJQUVELG9CQUFvQjtRQUNuQixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7SUFDbkIsQ0FBQztDQUNEO0FBS0QsU0FBUyxpQkFBaUIsQ0FBQyxJQUFpQjtJQUMzQyxNQUFNLE1BQU0sR0FBRyxJQUFJLEtBQUssRUFBTyxDQUFBO0lBQy9CLE1BQU0sSUFBSSxHQUFjLEVBQUUsQ0FBQTtJQUMxQixJQUFJLFFBQVEsR0FBRyxFQUFFLENBQUE7SUFFakIsU0FBUyxPQUFPLENBQUMsQ0FBYztRQUM5QixJQUFJLFFBQVEsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNuQixLQUFLLE1BQU0sSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUN0QixJQUFJLElBQUksRUFBRSxDQUFDO29CQUNWLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDZCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUFJLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN4QixRQUFRLElBQUksS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDekIsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDcEIsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNyQixDQUFDO1FBQ0YsQ0FBQzthQUFNLElBQUksTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDckIsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7SUFFYixNQUFNLE1BQU0sR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLE1BQU0sQ0FBQyxDQUFBO0lBQ3BDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQTtJQUNwQixPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUFDRCxTQUFTLFVBQVUsQ0FBQyxJQUFZO0lBQy9CLE9BQU8sTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBO0FBQ3hDLENBQUM7QUFDRCxTQUFTLFVBQVUsQ0FBQyxJQUFZO0lBQy9CLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksSUFBSSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtBQUN2RSxDQUFDO0FBQ0QsU0FBUyxNQUFNLENBQ2QsSUFBWSxFQUNaLFVBQXNFO0lBQ3JFLEtBQUssRUFBRSxPQUFPO0NBQ2Q7SUFFRCxTQUFTLFFBQVEsQ0FBQyxRQUFnQztRQUNqRCxPQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUU7WUFDN0UsT0FBTyxHQUFHLFdBQVcsR0FBRyxRQUFRLElBQUksU0FBUyxHQUFHLENBQUE7UUFDakQsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ1AsQ0FBQztJQUVELE1BQU0sS0FBSyxHQUEyQjtRQUNyQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7S0FDcEIsQ0FBQTtJQUNELElBQUksT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzNCLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLGNBQWMsQ0FBQTtJQUMxQyxDQUFDO0lBQ0QsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbEIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLE1BQU0sQ0FBQTtJQUM5QixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUk7UUFDSixLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQztLQUN0QixDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxXQUFXLENBQUMsS0FBYyxFQUFFLFlBQW9CO0lBQy9ELFFBQVEsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUN0QixLQUFLLFFBQVE7WUFDWixPQUFPLEVBQUUsR0FBRyxLQUFLLENBQUE7UUFDbEIsS0FBSyxRQUFRO1lBQ1osSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxZQUFZLEVBQUUsQ0FBQztnQkFDdEMsT0FBTyxJQUFJLEtBQUssR0FBRyxDQUFBO1lBQ3BCLENBQUM7WUFDRCxPQUFPLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsWUFBWSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUE7UUFFcEQsS0FBSyxTQUFTO1lBQ2IsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFBO1FBQ2hDLEtBQUssV0FBVztZQUNmLE9BQU8sV0FBVyxDQUFBO1FBQ25CLEtBQUssUUFBUTtZQUNaLElBQUksS0FBSyxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUNwQixPQUFPLE1BQU0sQ0FBQTtZQUNkLENBQUM7WUFDRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDMUIsT0FBTyxXQUFXLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQ3hDLENBQUM7WUFDRCxPQUFPLFlBQVksQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDekMsS0FBSyxRQUFRO1lBQ1osT0FBTyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDeEIsS0FBSyxVQUFVO1lBQ2QsT0FBTyxhQUFhLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQTtRQUMzRDtZQUNDLE9BQU8sRUFBRSxHQUFHLEtBQUssQ0FBQTtJQUNuQixDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLEtBQWdCLEVBQUUsWUFBb0I7SUFDMUQsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFBO0lBQ2pCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQTtJQUNoQixLQUFLLE1BQU0sR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxJQUFJLENBQUE7UUFDZixDQUFDO1FBQ0QsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxZQUFZLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksS0FBSyxDQUFBO1lBQ2YsTUFBSztRQUNOLENBQUM7UUFDRCxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ2IsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRSxZQUFZLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUE7SUFDOUQsQ0FBQztJQUNELE1BQU0sSUFBSSxJQUFJLENBQUE7SUFDZCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUFFRCxTQUFTLFlBQVksQ0FBQyxLQUFhLEVBQUUsWUFBb0I7SUFDeEQsSUFBSSxPQUFPLEtBQUssQ0FBQyxRQUFRLEtBQUssVUFBVSxJQUFJLEtBQUssQ0FBQyxRQUFRLEtBQUssTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUMxRixNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDNUIsSUFBSSxHQUFHLENBQUMsTUFBTSxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2hDLE9BQU8sR0FBRyxDQUFBO1FBQ1gsQ0FBQztRQUNELE9BQU8sR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQTtJQUNsRCxDQUFDO0lBRUQsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBRXJDLElBQUksTUFBTSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0lBQy9DLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQTtJQUNoQixLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ2hELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxJQUFJLENBQUE7UUFDZixDQUFDO1FBQ0QsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxZQUFZLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksS0FBSyxDQUFBO1lBQ2YsTUFBSztRQUNOLENBQUM7UUFDRCxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ2IsTUFBTSxJQUFJLEdBQUcsR0FBRyxLQUFLLFdBQVcsQ0FBQyxHQUFHLEVBQUUsWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFBO0lBQ3RFLENBQUM7SUFDRCxNQUFNLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtJQUNoQyxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUFFRCxTQUFTLE1BQU0sQ0FBQyxHQUFXLEVBQUUsS0FBYTtJQUN6QyxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUE7SUFDZixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDakMsTUFBTSxJQUFJLEdBQUcsQ0FBQTtJQUNkLENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUFFRCxTQUFTLE1BQU0sQ0FBQyxHQUFXLEVBQUUsTUFBYztJQUMxQyxPQUFPLEdBQUcsQ0FBQyxNQUFNLEdBQUcsTUFBTSxFQUFFLENBQUM7UUFDNUIsR0FBRyxJQUFJLEdBQUcsQ0FBQTtJQUNYLENBQUM7SUFDRCxPQUFPLEdBQUcsQ0FBQTtBQUNYLENBQUMifQ==
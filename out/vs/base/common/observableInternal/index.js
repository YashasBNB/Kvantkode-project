/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// This is a facade for the observable implementation. Only import from here!
export { observableValueOpts } from './api.js';
export { autorun, autorunDelta, autorunHandleChanges, autorunOpts, autorunWithStore, autorunWithStoreHandleChanges, } from './autorun.js';
export { asyncTransaction, disposableObservableValue, globalTransaction, observableValue, subtransaction, transaction, TransactionImpl, } from './base.js';
export { derived, derivedDisposable, derivedHandleChanges, derivedOpts, derivedWithSetter, derivedWithStore, } from './derived.js';
export { ObservableLazy, ObservableLazyPromise, ObservablePromise, PromiseResult, } from './promise.js';
export { derivedWithCancellationToken, waitForState } from './utilsCancellation.js';
export { constObservable, debouncedObservableDeprecated, derivedConstOnceDefined, derivedObservableWithCache, derivedObservableWithWritableCache, keepObserved, latestChangedValue, mapObservableArrayCached, observableFromEvent, observableFromEventOpts, observableFromPromise, observableFromValueWithChangeEvent, observableSignal, observableSignalFromEvent, recomputeInitiallyAndOnChange, runOnChange, runOnChangeWithStore, signalFromObservable, ValueWithChangeEventFromObservable, wasEventTriggeredRecently, } from './utils.js';
import { addLogger, setLogObservableFn } from './logging/logging.js';
import { ConsoleObservableLogger, logObservableToConsole, } from './logging/consoleObservableLogger.js';
import { DevToolsLogger } from './logging/debugger/devToolsLogger.js';
import { env } from '../process.js';
setLogObservableFn(logObservableToConsole);
// Remove "//" in the next line to enable logging
const enableLogging = false;
// || Boolean("true") // done "weirdly" so that a lint warning prevents you from pushing this
if (enableLogging) {
    addLogger(new ConsoleObservableLogger());
}
if (env && env['VSCODE_DEV_DEBUG']) {
    // To debug observables you also need the extension "ms-vscode.debug-value-editor"
    addLogger(DevToolsLogger.getInstance());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsNkVBQTZFO0FBRTdFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLFVBQVUsQ0FBQTtBQUM5QyxPQUFPLEVBQ04sT0FBTyxFQUNQLFlBQVksRUFDWixvQkFBb0IsRUFDcEIsV0FBVyxFQUNYLGdCQUFnQixFQUNoQiw2QkFBNkIsR0FDN0IsTUFBTSxjQUFjLENBQUE7QUFDckIsT0FBTyxFQUNOLGdCQUFnQixFQUNoQix5QkFBeUIsRUFDekIsaUJBQWlCLEVBQ2pCLGVBQWUsRUFDZixjQUFjLEVBQ2QsV0FBVyxFQUNYLGVBQWUsR0FVZixNQUFNLFdBQVcsQ0FBQTtBQUNsQixPQUFPLEVBQ04sT0FBTyxFQUNQLGlCQUFpQixFQUNqQixvQkFBb0IsRUFDcEIsV0FBVyxFQUNYLGlCQUFpQixFQUNqQixnQkFBZ0IsR0FDaEIsTUFBTSxjQUFjLENBQUE7QUFDckIsT0FBTyxFQUNOLGNBQWMsRUFDZCxxQkFBcUIsRUFDckIsaUJBQWlCLEVBQ2pCLGFBQWEsR0FDYixNQUFNLGNBQWMsQ0FBQTtBQUNyQixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDbkYsT0FBTyxFQUNOLGVBQWUsRUFDZiw2QkFBNkIsRUFDN0IsdUJBQXVCLEVBQ3ZCLDBCQUEwQixFQUMxQixrQ0FBa0MsRUFDbEMsWUFBWSxFQUNaLGtCQUFrQixFQUNsQix3QkFBd0IsRUFDeEIsbUJBQW1CLEVBQ25CLHVCQUF1QixFQUN2QixxQkFBcUIsRUFDckIsa0NBQWtDLEVBQ2xDLGdCQUFnQixFQUNoQix5QkFBeUIsRUFDekIsNkJBQTZCLEVBQzdCLFdBQVcsRUFDWCxvQkFBb0IsRUFDcEIsb0JBQW9CLEVBQ3BCLGtDQUFrQyxFQUNsQyx5QkFBeUIsR0FFekIsTUFBTSxZQUFZLENBQUE7QUFHbkIsT0FBTyxFQUFFLFNBQVMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ3BFLE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsc0JBQXNCLEdBQ3RCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFFbkMsa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtBQUUxQyxpREFBaUQ7QUFDakQsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFBO0FBQzNCLDZGQUE2RjtBQUM3RixJQUFJLGFBQWEsRUFBRSxDQUFDO0lBQ25CLFNBQVMsQ0FBQyxJQUFJLHVCQUF1QixFQUFFLENBQUMsQ0FBQTtBQUN6QyxDQUFDO0FBRUQsSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQztJQUNwQyxrRkFBa0Y7SUFDbEYsU0FBUyxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFBO0FBQ3hDLENBQUMifQ==
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyw2RUFBNkU7QUFFN0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sVUFBVSxDQUFBO0FBQzlDLE9BQU8sRUFDTixPQUFPLEVBQ1AsWUFBWSxFQUNaLG9CQUFvQixFQUNwQixXQUFXLEVBQ1gsZ0JBQWdCLEVBQ2hCLDZCQUE2QixHQUM3QixNQUFNLGNBQWMsQ0FBQTtBQUNyQixPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLHlCQUF5QixFQUN6QixpQkFBaUIsRUFDakIsZUFBZSxFQUNmLGNBQWMsRUFDZCxXQUFXLEVBQ1gsZUFBZSxHQVVmLE1BQU0sV0FBVyxDQUFBO0FBQ2xCLE9BQU8sRUFDTixPQUFPLEVBQ1AsaUJBQWlCLEVBQ2pCLG9CQUFvQixFQUNwQixXQUFXLEVBQ1gsaUJBQWlCLEVBQ2pCLGdCQUFnQixHQUNoQixNQUFNLGNBQWMsQ0FBQTtBQUNyQixPQUFPLEVBQ04sY0FBYyxFQUNkLHFCQUFxQixFQUNyQixpQkFBaUIsRUFDakIsYUFBYSxHQUNiLE1BQU0sY0FBYyxDQUFBO0FBQ3JCLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNuRixPQUFPLEVBQ04sZUFBZSxFQUNmLDZCQUE2QixFQUM3Qix1QkFBdUIsRUFDdkIsMEJBQTBCLEVBQzFCLGtDQUFrQyxFQUNsQyxZQUFZLEVBQ1osa0JBQWtCLEVBQ2xCLHdCQUF3QixFQUN4QixtQkFBbUIsRUFDbkIsdUJBQXVCLEVBQ3ZCLHFCQUFxQixFQUNyQixrQ0FBa0MsRUFDbEMsZ0JBQWdCLEVBQ2hCLHlCQUF5QixFQUN6Qiw2QkFBNkIsRUFDN0IsV0FBVyxFQUNYLG9CQUFvQixFQUNwQixvQkFBb0IsRUFDcEIsa0NBQWtDLEVBQ2xDLHlCQUF5QixHQUV6QixNQUFNLFlBQVksQ0FBQTtBQUduQixPQUFPLEVBQUUsU0FBUyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDcEUsT0FBTyxFQUNOLHVCQUF1QixFQUN2QixzQkFBc0IsR0FDdEIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDckUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUVuQyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO0FBRTFDLGlEQUFpRDtBQUNqRCxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUE7QUFDM0IsNkZBQTZGO0FBQzdGLElBQUksYUFBYSxFQUFFLENBQUM7SUFDbkIsU0FBUyxDQUFDLElBQUksdUJBQXVCLEVBQUUsQ0FBQyxDQUFBO0FBQ3pDLENBQUM7QUFFRCxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDO0lBQ3BDLGtGQUFrRjtJQUNsRixTQUFTLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7QUFDeEMsQ0FBQyJ9
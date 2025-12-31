/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DebugNameData } from './debugName.js';
import { CancellationError, CancellationTokenSource, } from './commonFacade/cancellation.js';
import { Derived } from './derived.js';
import { strictEquals } from './commonFacade/deps.js';
import { autorun } from './autorun.js';
export function waitForState(observable, predicate, isError, cancellationToken) {
    if (!predicate) {
        predicate = (state) => state !== null && state !== undefined;
    }
    return new Promise((resolve, reject) => {
        let isImmediateRun = true;
        let shouldDispose = false;
        const stateObs = observable.map((state) => {
            /** @description waitForState.state */
            return {
                isFinished: predicate(state),
                error: isError ? isError(state) : false,
                state,
            };
        });
        const d = autorun((reader) => {
            /** @description waitForState */
            const { isFinished, error, state } = stateObs.read(reader);
            if (isFinished || error) {
                if (isImmediateRun) {
                    // The variable `d` is not initialized yet
                    shouldDispose = true;
                }
                else {
                    d.dispose();
                }
                if (error) {
                    reject(error === true ? state : error);
                }
                else {
                    resolve(state);
                }
            }
        });
        if (cancellationToken) {
            const dc = cancellationToken.onCancellationRequested(() => {
                d.dispose();
                dc.dispose();
                reject(new CancellationError());
            });
            if (cancellationToken.isCancellationRequested) {
                d.dispose();
                dc.dispose();
                reject(new CancellationError());
                return;
            }
        }
        isImmediateRun = false;
        if (shouldDispose) {
            d.dispose();
        }
    });
}
export function derivedWithCancellationToken(computeFnOrOwner, computeFnOrUndefined) {
    let computeFn;
    let owner;
    if (computeFnOrUndefined === undefined) {
        computeFn = computeFnOrOwner;
        owner = undefined;
    }
    else {
        owner = computeFnOrOwner;
        computeFn = computeFnOrUndefined;
    }
    let cancellationTokenSource = undefined;
    return new Derived(new DebugNameData(owner, undefined, computeFn), (r) => {
        if (cancellationTokenSource) {
            cancellationTokenSource.dispose(true);
        }
        cancellationTokenSource = new CancellationTokenSource();
        return computeFn(r, cancellationTokenSource.token);
    }, undefined, undefined, () => cancellationTokenSource?.dispose(), strictEquals);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHNDYW5jZWxsYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvdXRpbHNDYW5jZWxsYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFjLGFBQWEsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQzFELE9BQU8sRUFDTixpQkFBaUIsRUFFakIsdUJBQXVCLEdBQ3ZCLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQWtCdEMsTUFBTSxVQUFVLFlBQVksQ0FDM0IsVUFBMEIsRUFDMUIsU0FBaUMsRUFDakMsT0FBcUQsRUFDckQsaUJBQXFDO0lBRXJDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNoQixTQUFTLEdBQUcsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssS0FBSyxJQUFJLElBQUksS0FBSyxLQUFLLFNBQVMsQ0FBQTtJQUM3RCxDQUFDO0lBQ0QsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUN0QyxJQUFJLGNBQWMsR0FBRyxJQUFJLENBQUE7UUFDekIsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFBO1FBQ3pCLE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUN6QyxzQ0FBc0M7WUFDdEMsT0FBTztnQkFDTixVQUFVLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQztnQkFDNUIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFD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
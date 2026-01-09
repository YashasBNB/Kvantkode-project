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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHNDYW5jZWxsYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC91dGlsc0NhbmNlbGxhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQWMsYUFBYSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDMUQsT0FBTyxFQUNOLGlCQUFpQixFQUVqQix1QkFBdUIsR0FDdkIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQ3RDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBa0J0QyxNQUFNLFVBQVUsWUFBWSxDQUMzQixVQUEwQixFQUMxQixTQUFpQyxFQUNqQyxPQUFxRCxFQUNyRCxpQkFBcUM7SUFFckMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2hCLFNBQVMsR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxLQUFLLElBQUksSUFBSSxLQUFLLEtBQUssU0FBUyxDQUFBO0lBQzdELENBQUM7SUFDRCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3RDLElBQUksY0FBYyxHQUFHLElBQUksQ0FBQTtRQUN6QixJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUE7UUFDekIsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ3pDLHNDQUFzQztZQUN0QyxPQUFPO2dCQUNOLFVBQVUsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDO2dCQUM1QixL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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isThenable, Promises } from '../../../base/common/async.js';
// Shared veto handling across main and renderer
export function handleVetos(vetos, onError) {
    if (vetos.length === 0) {
        return Promise.resolve(false);
    }
    const promises = [];
    let lazyValue = false;
    for (const valueOrPromise of vetos) {
        // veto, done
        if (valueOrPromise === true) {
            return Promise.resolve(true);
        }
        if (isThenable(valueOrPromise)) {
            promises.push(valueOrPromise.then((value) => {
                if (value) {
                    lazyValue = true; // veto, done
                }
            }, (err) => {
                onError(err); // error, treated like a veto, done
                lazyValue = true;
            }));
        }
    }
    return Promises.settled(promises).then(() => lazyValue);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9saWZlY3ljbGUvY29tbW9uL2xpZmVjeWNsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXBFLGdEQUFnRDtBQUNoRCxNQUFNLFVBQVUsV0FBVyxDQUMxQixLQUFxQyxFQUNyQyxPQUErQjtJQUUvQixJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDeEIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzlCLENBQUM7SUFFRCxNQUFNLFFBQVEsR0FBb0IsRUFBRSxDQUFBO0lBQ3BDLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQTtJQUVyQixLQUFLLE1BQU0sY0FBYyxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ3BDLGFBQWE7UUFDYixJQUFJLGNBQWMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUM3QixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUVELElBQUksVUFBVSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDaEMsUUFBUSxDQUFDLElBQUksQ0FDWixjQUFjLENBQUMsSUFBSSxDQUNsQixDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUNULElBQUksS0FBSyxFQUFFLENBQUM7b0JBQ1gsU0FBUyxHQUFHLElBQUksQ0FBQSxDQUFDLGFBQWE7Z0JBQy9CLENBQUM7WUFDRixDQUFDLEVBQ0QsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFDUCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUEsQ0FBQyxtQ0FBbUM7Z0JBQ2hELFNBQVMsR0FBRyxJQUFJLENBQUE7WUFDakIsQ0FBQyxDQUNELENBQ0QsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtBQUN4RCxDQUFDIn0=
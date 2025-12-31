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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbGlmZWN5Y2xlL2NvbW1vbi9saWZlY3ljbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVwRSxnREFBZ0Q7QUFDaEQsTUFBTSxVQUFVLFdBQVcsQ0FDMUIsS0FBcUMsRUFDckMsT0FBK0I7SUFFL0IsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3hCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBRUQsTUFBTSxRQUFRLEdBQW9CLEVBQUUsQ0FBQTtJQUNwQyxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUE7SUFFckIsS0FBSyxNQUFNLGNBQWMsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNwQyxhQUFhO1FBQ2IsSUFBSSxjQUFjLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDN0IsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzdCLENBQUM7UUFFRCxJQUFJLFVBQVUsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1lBQ2hDLFFBQVEsQ0FBQyxJQUFJLENBQ1osY0FBYyxDQUFDLElBQUksQ0FDbEIsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDVCxJQUFJLEtBQUssRUFBRSxDQUFDO29CQUNYLFNBQVMsR0FBRyxJQUFJLENBQUEsQ0FBQyxhQUFhO2dCQUMvQixDQUFDO1lBQ0YsQ0FBQyxFQUNELENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQ1AsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBLENBQUMsbUNBQW1DO2dCQUNoRCxTQUFTLEdBQUcsSUFBSSxDQUFBO1lBQ2pCLENBQUMsQ0FDRCxDQUNELENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUE7QUFDeEQsQ0FBQyJ9
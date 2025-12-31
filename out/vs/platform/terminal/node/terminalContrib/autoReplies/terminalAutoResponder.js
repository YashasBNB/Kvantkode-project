/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { timeout } from '../../../../../base/common/async.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { isWindows } from '../../../../../base/common/platform.js';
/**
 * Tracks a terminal process's data stream and responds immediately when a matching string is
 * received. This is done in a low overhead way and is ideally run on the same process as the
 * where the process is handled to minimize latency.
 */
export class TerminalAutoResponder extends Disposable {
    constructor(proc, matchWord, response, logService) {
        super();
        this._pointer = 0;
        this._paused = false;
        /**
         * Each reply is throttled by a second to avoid resource starvation and responding to screen
         * reprints on Winodws.
         */
        this._throttled = false;
        this._register(proc.onProcessData((e) => {
            if (this._paused || this._throttled) {
                return;
            }
            const data = typeof e === 'string' ? e : e.data;
            for (let i = 0; i < data.length; i++) {
                if (data[i] === matchWord[this._pointer]) {
                    this._pointer++;
                }
                else {
                    this._reset();
                }
                // Auto reply and reset
                if (this._pointer === matchWord.length) {
                    logService.debug(`Auto reply match: "${matchWord}", response: "${response}"`);
                    proc.input(response);
                    this._throttled = true;
                    timeout(1000).then(() => (this._throttled = false));
                    this._reset();
                }
            }
        }));
    }
    _reset() {
        this._pointer = 0;
    }
    /**
     * No auto response will happen after a resize on Windows in case the resize is a result of
     * reprinting the screen.
     */
    handleResize() {
        if (isWindows) {
            this._paused = true;
        }
    }
    handleInput() {
        this._paused = false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBdXRvUmVzcG9uZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvbm9kZS90ZXJtaW5hbENvbnRyaWIvYXV0b1JlcGxpZXMvdGVybWluYWxBdXRvUmVzcG9uZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBSWxFOzs7O0dBSUc7QUFDSCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsVUFBVTtJQVVwRCxZQUNDLElBQTJCLEVBQzNCLFNBQWlCLEVBQ2pCLFFBQWdCLEVBQ2hCLFVBQXVCO1FBRXZCLEtBQUssRUFBRSxDQUFBO1FBZkEsYUFBUSxHQUFHLENBQUMsQ0FBQTtRQUNaLFlBQU8sR0FBRyxLQUFLLENBQUE7UUFFdkI7OztXQUdHO1FBQ0ssZUFBVSxHQUFHLEtBQUssQ0FBQTtRQVV6QixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN4QixJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNyQyxPQUFNO1lBQ1AsQ0FBQztZQUNELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO1lBQy9DLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3RDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztvQkFDMUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO2dCQUNoQixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO2dCQUNkLENBQUM7Z0JBQ0QsdUJBQXVCO2dCQUN2QixJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUN4QyxVQUFVLENBQUMsS0FBSyxDQUFDLHNCQUFzQixTQUFTLGlCQUFpQixRQUFRLEdBQUcsQ0FBQyxDQUFBO29CQUM3RSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO29CQUNwQixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQTtvQkFDdEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQTtvQkFDbkQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO2dCQUNkLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyxNQUFNO1FBQ2IsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUE7SUFDbEIsQ0FBQztJQUVEOzs7T0FHRztJQUNILFlBQVk7UUFDWCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUE7UUFDcEIsQ0FBQztJQUNGLENBQUM7SUFFRCxXQUFXO1FBQ1YsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUE7SUFDckIsQ0FBQztDQUNEIn0=
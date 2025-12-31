/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { AbstractExtHostConsoleForwarder } from '../common/extHostConsoleForwarder.js';
import { IExtHostInitDataService } from '../common/extHostInitDataService.js';
import { IExtHostRpcService } from '../common/extHostRpcService.js';
const MAX_STREAM_BUFFER_LENGTH = 1024 * 1024;
let ExtHostConsoleForwarder = class ExtHostConsoleForwarder extends AbstractExtHostConsoleForwarder {
    constructor(extHostRpc, initData) {
        super(extHostRpc, initData);
        this._isMakingConsoleCall = false;
        this._wrapStream('stderr', 'error');
        this._wrapStream('stdout', 'log');
    }
    _nativeConsoleLogMessage(method, original, args) {
        const stream = method === 'error' || method === 'warn' ? process.stderr : process.stdout;
        this._isMakingConsoleCall = true;
        stream.write(`\n${"START_NATIVE_LOG" /* NativeLogMarkers.Start */}\n`);
        original.apply(console, args);
        stream.write(`\n${"END_NATIVE_LOG" /* NativeLogMarkers.End */}\n`);
        this._isMakingConsoleCall = false;
    }
    /**
     * Wraps process.stderr/stdout.write() so that it is transmitted to the
     * renderer or CLI. It both calls through to the original method as well
     * as to console.log with complete lines so that they're made available
     * to the debugger/CLI.
     */
    _wrapStream(streamName, severity) {
        const stream = process[streamName];
        const original = stream.write;
        let buf = '';
        Object.defineProperty(stream, 'write', {
            set: () => { },
            get: () => (chunk, encoding, callback) => {
                if (!this._isMakingConsoleCall) {
                    buf += chunk.toString(encoding);
                    const eol = buf.length > MAX_STREAM_BUFFER_LENGTH ? buf.length : buf.lastIndexOf('\n');
                    if (eol !== -1) {
                        console[severity](buf.slice(0, eol));
                        buf = buf.slice(eol + 1);
                    }
                }
                original.call(stream, chunk, encoding, callback);
            },
        });
    }
};
ExtHostConsoleForwarder = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService)
], ExtHostConsoleForwarder);
export { ExtHostConsoleForwarder };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbnNvbGVGb3J3YXJkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL25vZGUvZXh0SG9zdENvbnNvbGVGb3J3YXJkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHbkUsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFBO0FBRXJDLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsK0JBQStCO0lBRzNFLFlBQ3FCLFVBQThCLEVBQ3pCLFFBQWlDO1FBRTFELEtBQUssQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFOcEIseUJBQW9CLEdBQVksS0FBSyxDQUFBO1FBUTVDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ25DLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFa0Isd0JBQXdCLENBQzFDLE1BQW1ELEVBQ25ELFFBQWtDLEVBQ2xDLElBQWdCO1FBRWhCLE1BQU0sTUFBTSxHQUFHLE1BQU0sS0FBSyxPQUFPLElBQUksTUFBTSxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQTtRQUN4RixJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSywrQ0FBc0IsSUFBSSxDQUFDLENBQUE7UUFDN0MsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBVyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLDJDQUFvQixJQUFJLENBQUMsQ0FBQTtRQUMzQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsS0FBSyxDQUFBO0lBQ2xDLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNLLFdBQVcsQ0FBQyxVQUErQixFQUFFLFFBQWtDO1FBQ3RGLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNsQyxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFBO1FBRTdCLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQTtRQUVaLE1BQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRTtZQUN0QyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQztZQUNiLEdBQUcsRUFDRixHQUFHLEVBQUUsQ0FDTCxDQUNDLEtBQTBCLEVBQzFCLFFBQXlCLEVBQ3pCLFFBQWdDLEVBQy9CLEVBQUU7Z0JBQ0gsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO29CQUNoQyxHQUFHLElBQUssS0FBYSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtvQkFDeEMsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sR0FBRyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDdEYsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDaEIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7d0JBQ3BDLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtvQkFDekIsQ0FBQztnQkFDRixDQUFDO2dCQUVELFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDakQsQ0FBQztTQUNGLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCxDQUFBO0FBNURZLHVCQUF1QjtJQUlqQyxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsdUJBQXVCLENBQUE7R0FMYix1QkFBdUIsQ0E0RG5DIn0=
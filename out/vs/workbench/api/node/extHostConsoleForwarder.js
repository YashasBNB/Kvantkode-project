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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbnNvbGVGb3J3YXJkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS9leHRIb3N0Q29uc29sZUZvcndhcmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUduRSxNQUFNLHdCQUF3QixHQUFHLElBQUksR0FBRyxJQUFJLENBQUE7QUFFckMsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSwrQkFBK0I7SUFHM0UsWUFDcUIsVUFBOEIsRUFDekIsUUFBaUM7UUFFMUQsS0FBSyxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQU5wQix5QkFBb0IsR0FBWSxLQUFLLENBQUE7UUFRNUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDbkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVrQix3QkFBd0IsQ0FDMUMsTUFBbUQsRUFDbkQsUUFBa0MsRUFDbEMsSUFBZ0I7UUFFaEIsTUFBTSxNQUFNLEdBQUcsTUFBTSxLQUFLLE9BQU8sSUFBSSxNQUFNLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFBO1FBQ3hGLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUE7UUFDaEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLCtDQUFzQixJQUFJLENBQUMsQ0FBQTtRQUM3QyxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFXLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssMkNBQW9CLElBQUksQ0FBQyxDQUFBO1FBQzNDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUE7SUFDbEMsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ssV0FBVyxDQUFDLFVBQStCLEVBQUUsUUFBa0M7UUFDdEYsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUE7UUFFN0IsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFBO1FBRVosTUFBTSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFO1lBQ3RDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDO1lBQ2IsR0FBRyxFQUNGLEdBQUcsRUFBRSxDQUNMLENBQ0MsS0FBMEIsRUFDMUIsUUFBeUIsRUFDekIsUUFBZ0MsRUFDL0IsRUFBRTtnQkFDSCxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7b0JBQ2hDLEdBQUcsSUFBSyxLQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO29CQUN4QyxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxHQUFHLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO29CQUN0RixJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO3dCQUNoQixPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTt3QkFDcEMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFBO29CQUN6QixDQUFDO2dCQUNGLENBQUM7Z0JBRUQsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUNqRCxDQUFDO1NBQ0YsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNELENBQUE7QUE1RFksdUJBQXVCO0lBSWpDLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSx1QkFBdUIsQ0FBQTtHQUxiLHVCQUF1QixDQTREbkMifQ==
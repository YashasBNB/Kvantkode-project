/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
export class DebugCompoundRoot {
    constructor() {
        this.stopped = false;
        this.stopEmitter = new Emitter();
        this.onDidSessionStop = this.stopEmitter.event;
    }
    sessionStopped() {
        if (!this.stopped) {
            // avoid sending extranous terminate events
            this.stopped = true;
            this.stopEmitter.fire();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb21wb3VuZFJvb3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2NvbW1vbi9kZWJ1Z0NvbXBvdW5kUm9vdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUQsTUFBTSxPQUFPLGlCQUFpQjtJQUE5QjtRQUNTLFlBQU8sR0FBRyxLQUFLLENBQUE7UUFDZixnQkFBVyxHQUFHLElBQUksT0FBTyxFQUFRLENBQUE7UUFFekMscUJBQWdCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUE7SUFTMUMsQ0FBQztJQVBBLGNBQWM7UUFDYixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLDJDQUEyQztZQUMzQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQTtZQUNuQixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3hCLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==
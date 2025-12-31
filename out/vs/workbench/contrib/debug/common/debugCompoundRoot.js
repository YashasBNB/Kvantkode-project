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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb21wb3VuZFJvb3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9jb21tb24vZGVidWdDb21wb3VuZFJvb3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTFELE1BQU0sT0FBTyxpQkFBaUI7SUFBOUI7UUFDUyxZQUFPLEdBQUcsS0FBSyxDQUFBO1FBQ2YsZ0JBQVcsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFBO1FBRXpDLHFCQUFnQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFBO0lBUzFDLENBQUM7SUFQQSxjQUFjO1FBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQiwyQ0FBMkM7WUFDM0MsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUE7WUFDbkIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN4QixDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=
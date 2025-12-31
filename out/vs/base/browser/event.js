/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../common/event.js';
export class DomEmitter {
    get event() {
        return this.emitter.event;
    }
    constructor(element, type, useCapture) {
        const fn = (e) => this.emitter.fire(e);
        this.emitter = new Emitter({
            onWillAddFirstListener: () => element.addEventListener(type, fn, useCapture),
            onDidRemoveLastListener: () => element.removeEventListener(type, fn, useCapture),
        });
    }
    dispose() {
        this.emitter.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvZXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBc0IsTUFBTSxvQkFBb0IsQ0FBQTtBQXlCaEUsTUFBTSxPQUFPLFVBQVU7SUFHdEIsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQTtJQUMxQixDQUFDO0lBS0QsWUFBWSxPQUFxQixFQUFFLElBQU8sRUFBRSxVQUFvQjtRQUMvRCxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBbUIsQ0FBQyxDQUFBO1FBQy9ELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUM7WUFDMUIsc0JBQXNCLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsVUFBVSxDQUFDO1lBQzVFLHVCQUF1QixFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLFVBQVUsQ0FBQztTQUNoRixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdkIsQ0FBQztDQUNEIn0=
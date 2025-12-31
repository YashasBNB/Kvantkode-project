/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ActionRunner } from '../../../../base/common/actions.js';
export class ActionRunnerWithContext extends ActionRunner {
    constructor(_getContext) {
        super();
        this._getContext = _getContext;
    }
    runAction(action, _context) {
        const ctx = this._getContext();
        return super.runAction(action, ctx);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvbXVsdGlEaWZmRWRpdG9yL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUxRSxNQUFNLE9BQU8sdUJBQXdCLFNBQVEsWUFBWTtJQUN4RCxZQUE2QixXQUEwQjtRQUN0RCxLQUFLLEVBQUUsQ0FBQTtRQURxQixnQkFBVyxHQUFYLFdBQVcsQ0FBZTtJQUV2RCxDQUFDO0lBRWtCLFNBQVMsQ0FBQyxNQUFlLEVBQUUsUUFBa0I7UUFDL0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQzlCLE9BQU8sS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDcEMsQ0FBQztDQUNEIn0=
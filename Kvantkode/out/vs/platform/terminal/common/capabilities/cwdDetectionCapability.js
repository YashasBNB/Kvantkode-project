/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export class CwdDetectionCapability extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 0 /* TerminalCapability.CwdDetection */;
        this._cwd = '';
        this._cwds = new Map();
        this._onDidChangeCwd = this._register(new Emitter());
        this.onDidChangeCwd = this._onDidChangeCwd.event;
    }
    /**
     * Gets the list of cwds seen in this session in order of last accessed.
     */
    get cwds() {
        return Array.from(this._cwds.keys());
    }
    getCwd() {
        return this._cwd;
    }
    updateCwd(cwd) {
        const didChange = this._cwd !== cwd;
        this._cwd = cwd;
        const count = this._cwds.get(this._cwd) || 0;
        this._cwds.delete(this._cwd); // Delete to put it at the bottom of the iterable
        this._cwds.set(this._cwd, count + 1);
        if (didChange) {
            this._onDidChangeCwd.fire(cwd);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3dkRGV0ZWN0aW9uQ2FwYWJpbGl0eS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvY29tbW9uL2NhcGFiaWxpdGllcy9jd2REZXRlY3Rpb25DYXBhYmlsaXR5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFHakUsTUFBTSxPQUFPLHNCQUF1QixTQUFRLFVBQVU7SUFBdEQ7O1FBQ1UsU0FBSSwyQ0FBa0M7UUFDdkMsU0FBSSxHQUFHLEVBQUUsQ0FBQTtRQUNULFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBd0MsQ0FBQTtRQVM5QyxvQkFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVUsQ0FBQyxDQUFBO1FBQy9ELG1CQUFjLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUE7SUFnQnJELENBQUM7SUF4QkE7O09BRUc7SUFDSCxJQUFJLElBQUk7UUFDUCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFLRCxNQUFNO1FBQ0wsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFBO0lBQ2pCLENBQUM7SUFFRCxTQUFTLENBQUMsR0FBVztRQUNwQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQTtRQUNuQyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQTtRQUNmLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDNUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBLENBQUMsaURBQWlEO1FBQzlFLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMvQixDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=
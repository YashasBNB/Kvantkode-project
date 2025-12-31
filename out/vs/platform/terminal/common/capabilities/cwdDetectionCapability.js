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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3dkRGV0ZWN0aW9uQ2FwYWJpbGl0eS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2NvbW1vbi9jYXBhYmlsaXRpZXMvY3dkRGV0ZWN0aW9uQ2FwYWJpbGl0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBR2pFLE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxVQUFVO0lBQXREOztRQUNVLFNBQUksMkNBQWtDO1FBQ3ZDLFNBQUksR0FBRyxFQUFFLENBQUE7UUFDVCxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQXdDLENBQUE7UUFTOUMsb0JBQWUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFVLENBQUMsQ0FBQTtRQUMvRCxtQkFBYyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFBO0lBZ0JyRCxDQUFDO0lBeEJBOztPQUVHO0lBQ0gsSUFBSSxJQUFJO1FBQ1AsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBS0QsTUFBTTtRQUNMLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQTtJQUNqQixDQUFDO0lBRUQsU0FBUyxDQUFDLEdBQVc7UUFDcEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksS0FBSyxHQUFHLENBQUE7UUFDbkMsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUE7UUFDZixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzVDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQSxDQUFDLGlEQUFpRDtRQUM5RSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNwQyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDL0IsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9
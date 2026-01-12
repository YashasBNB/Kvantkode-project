/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BasePty } from '../common/basePty.js';
/**
 * Responsible for establishing and maintaining a connection with an existing terminal process
 * created on the local pty host.
 */
export class LocalPty extends BasePty {
    constructor(id, shouldPersist, _proxy) {
        super(id, shouldPersist);
        this._proxy = _proxy;
    }
    start() {
        return this._proxy.start(this.id);
    }
    detach(forcePersist) {
        return this._proxy.detachFromProcess(this.id, forcePersist);
    }
    shutdown(immediate) {
        this._proxy.shutdown(this.id, immediate);
    }
    async processBinary(data) {
        if (this._inReplay) {
            return;
        }
        return this._proxy.processBinary(this.id, data);
    }
    input(data) {
        if (this._inReplay) {
            return;
        }
        this._proxy.input(this.id, data);
    }
    resize(cols, rows) {
        if (this._inReplay ||
            (this._lastDimensions.cols === cols && this._lastDimensions.rows === rows)) {
            return;
        }
        this._lastDimensions.cols = cols;
        this._lastDimensions.rows = rows;
        this._proxy.resize(this.id, cols, rows);
    }
    async clearBuffer() {
        this._proxy.clearBuffer?.(this.id);
    }
    freePortKillProcess(port) {
        if (!this._proxy.freePortKillProcess) {
            throw new Error('freePortKillProcess does not exist on the local pty service');
        }
        return this._proxy.freePortKillProcess(port);
    }
    async refreshProperty(type) {
        return this._proxy.refreshProperty(this.id, type);
    }
    async updateProperty(type, value) {
        return this._proxy.updateProperty(this.id, type, value);
    }
    acknowledgeDataEvent(charCount) {
        if (this._inReplay) {
            return;
        }
        this._proxy.acknowledgeDataEvent(this.id, charCount);
    }
    setUnicodeVersion(version) {
        return this._proxy.setUnicodeVersion(this.id, version);
    }
    handleOrphanQuestion() {
        this._proxy.orphanQuestionReply(this.id);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxQdHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2VsZWN0cm9uLXNhbmRib3gvbG9jYWxQdHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFTaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBRTlDOzs7R0FHRztBQUNILE1BQU0sT0FBTyxRQUFTLFNBQVEsT0FBTztJQUNwQyxZQUNDLEVBQVUsRUFDVixhQUFzQixFQUNMLE1BQW1CO1FBRXBDLEtBQUssQ0FBQyxFQUFFLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFGUCxXQUFNLEdBQU4sTUFBTSxDQUFhO0lBR3JDLENBQUM7SUFFRCxLQUFLO1FBQ0osT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVELE1BQU0sQ0FBQyxZQUFzQjtRQUM1QixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0lBRUQsUUFBUSxDQUFDLFNBQWtCO1FBQzFCLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDekMsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBWTtRQUMvQixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixPQUFNO1FBQ1AsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBRUQsS0FBSyxDQUFDLElBQVk7UUFDakIsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDcEIsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxNQUFNLENBQUMsSUFBWSxFQUFFLElBQVk7UUFDaEMsSUFDQyxJQUFJLENBQUMsU0FBUztZQUNkLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxFQUN6RSxDQUFDO1lBQ0YsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7UUFDaEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ3hDLENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVztRQUNoQixJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsbUJBQW1CLENBQUMsSUFBWTtRQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxLQUFLLENBQUMsNkRBQTZELENBQUMsQ0FBQTtRQUMvRSxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFFRCxLQUFLLENBQUMsZUFBZSxDQUFnQyxJQUFPO1FBQzNELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FDbkIsSUFBTyxFQUNQLEtBQTZCO1FBRTdCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDeEQsQ0FBQztJQUVELG9CQUFvQixDQUFDLFNBQWlCO1FBQ3JDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxPQUFtQjtRQUNwQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUN2RCxDQUFDO0lBRUQsb0JBQW9CO1FBQ25CLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7Q0FDRCJ9
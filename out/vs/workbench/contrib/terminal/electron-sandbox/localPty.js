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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxQdHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9lbGVjdHJvbi1zYW5kYm94L2xvY2FsUHR5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBU2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUU5Qzs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sUUFBUyxTQUFRLE9BQU87SUFDcEMsWUFDQyxFQUFVLEVBQ1YsYUFBc0IsRUFDTCxNQUFtQjtRQUVwQyxLQUFLLENBQUMsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBRlAsV0FBTSxHQUFOLE1BQU0sQ0FBYTtJQUdyQyxDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxNQUFNLENBQUMsWUFBc0I7UUFDNUIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUE7SUFDNUQsQ0FBQztJQUVELFFBQVEsQ0FBQyxTQUFrQjtRQUMxQixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLElBQVk7UUFDL0IsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDcEIsT0FBTTtRQUNQLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDaEQsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFZO1FBQ2pCLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsTUFBTSxDQUFDLElBQVksRUFBRSxJQUFZO1FBQ2hDLElBQ0MsSUFBSSxDQUFDLFNBQVM7WUFDZCxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsRUFDekUsQ0FBQztZQUNGLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVc7UUFDaEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELG1CQUFtQixDQUFDLElBQVk7UUFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksS0FBSyxDQUFDLDZEQUE2RCxDQUFDLENBQUE7UUFDL0UsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsS0FBSyxDQUFDLGVBQWUsQ0FBZ0MsSUFBTztRQUMzRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjLENBQ25CLElBQU8sRUFDUCxLQUE2QjtRQUU3QixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3hELENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxTQUFpQjtRQUNyQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNyRCxDQUFDO0lBRUQsaUJBQWlCLENBQUMsT0FBbUI7UUFDcEMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUVELG9CQUFvQjtRQUNuQixJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0NBQ0QifQ==
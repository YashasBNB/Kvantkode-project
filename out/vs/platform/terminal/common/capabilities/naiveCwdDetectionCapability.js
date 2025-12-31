/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
export class NaiveCwdDetectionCapability {
    constructor(_process) {
        this._process = _process;
        this.type = 1 /* TerminalCapability.NaiveCwdDetection */;
        this._cwd = '';
        this._onDidChangeCwd = new Emitter();
        this.onDidChangeCwd = this._onDidChangeCwd.event;
    }
    async getCwd() {
        if (!this._process) {
            return Promise.resolve('');
        }
        const newCwd = await this._process.getCwd();
        if (newCwd !== this._cwd) {
            this._onDidChangeCwd.fire(newCwd);
        }
        this._cwd = newCwd;
        return this._cwd;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmFpdmVDd2REZXRlY3Rpb25DYXBhYmlsaXR5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvY29tbW9uL2NhcGFiaWxpdGllcy9uYWl2ZUN3ZERldGVjdGlvbkNhcGFiaWxpdHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBSTFELE1BQU0sT0FBTywyQkFBMkI7SUFDdkMsWUFBNkIsUUFBK0I7UUFBL0IsYUFBUSxHQUFSLFFBQVEsQ0FBdUI7UUFDbkQsU0FBSSxnREFBdUM7UUFDNUMsU0FBSSxHQUFHLEVBQUUsQ0FBQTtRQUVBLG9CQUFlLEdBQUcsSUFBSSxPQUFPLEVBQVUsQ0FBQTtRQUMvQyxtQkFBYyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFBO0lBTFcsQ0FBQztJQU9oRSxLQUFLLENBQUMsTUFBTTtRQUNYLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzNCLENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDM0MsSUFBSSxNQUFNLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2xDLENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQTtRQUNsQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUE7SUFDakIsQ0FBQztDQUNEIn0=
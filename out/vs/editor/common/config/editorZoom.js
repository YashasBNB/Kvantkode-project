/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
export const EditorZoom = new (class {
    constructor() {
        this._zoomLevel = 0;
        this._onDidChangeZoomLevel = new Emitter();
        this.onDidChangeZoomLevel = this._onDidChangeZoomLevel.event;
    }
    getZoomLevel() {
        return this._zoomLevel;
    }
    setZoomLevel(zoomLevel) {
        zoomLevel = Math.min(Math.max(-5, zoomLevel), 20);
        if (this._zoomLevel === zoomLevel) {
            return;
        }
        this._zoomLevel = zoomLevel;
        this._onDidChangeZoomLevel.fire(this._zoomLevel);
    }
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yWm9vbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29uZmlnL2VkaXRvclpvb20udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBUTlELE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBZ0IsSUFBSSxDQUFDO0lBQUE7UUFDbkMsZUFBVSxHQUFXLENBQUMsQ0FBQTtRQUViLDBCQUFxQixHQUFHLElBQUksT0FBTyxFQUFVLENBQUE7UUFDOUMseUJBQW9CLEdBQWtCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUE7SUFldkYsQ0FBQztJQWJPLFlBQVk7UUFDbEIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFBO0lBQ3ZCLENBQUM7SUFFTSxZQUFZLENBQUMsU0FBaUI7UUFDcEMsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNqRCxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbkMsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtRQUMzQixJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNqRCxDQUFDO0NBQ0QsQ0FBQyxFQUFFLENBQUEifQ==
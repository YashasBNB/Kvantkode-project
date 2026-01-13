/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// import * as DOM from 'vs/base/browser/dom';
class NotebookLogger {
    constructor() {
        this._frameId = 0;
        this._domFrameLog();
    }
    _domFrameLog() {
        // DOM.scheduleAtNextAnimationFrame(() => {
        // 	this._frameId++;
        // 	this._domFrameLog();
        // }, 1000000);
    }
    debug(...args) {
        const date = new Date();
        console.log(`${date.getSeconds()}:${date.getMilliseconds().toString().padStart(3, '0')}`, `frame #${this._frameId}: `, ...args);
    }
}
const instance = new NotebookLogger();
export function notebookDebug(...args) {
    instance.debug(...args);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tMb2dnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvbm90ZWJvb2tMb2dnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsOENBQThDO0FBRTlDLE1BQU0sY0FBYztJQUNuQjtRQUdRLGFBQVEsR0FBRyxDQUFDLENBQUE7UUFGbkIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO0lBQ3BCLENBQUM7SUFFTyxZQUFZO1FBQ25CLDJDQUEyQztRQUMzQyxvQkFBb0I7UUFDcEIsd0JBQXdCO1FBQ3hCLGVBQWU7SUFDaEIsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLElBQVc7UUFDbkIsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQTtRQUN2QixPQUFPLENBQUMsR0FBRyxDQUNWLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQzVFLFVBQVUsSUFBSSxDQUFDLFFBQVEsSUFBSSxFQUMzQixHQUFHLElBQUksQ0FDUCxDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQTtBQUNyQyxNQUFNLFVBQVUsYUFBYSxDQUFDLEdBQUcsSUFBVztJQUMzQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUE7QUFDeEIsQ0FBQyJ9
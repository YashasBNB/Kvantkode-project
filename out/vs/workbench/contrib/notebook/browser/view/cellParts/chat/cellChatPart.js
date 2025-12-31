/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CellContentPart } from '../../cellPart.js';
export class CellChatPart extends CellContentPart {
    // private _controller: NotebookCellChatController | undefined;
    get activeCell() {
        return this.currentCell;
    }
    constructor(_notebookEditor, _partContainer) {
        super();
    }
    didRenderCell(element) {
        super.didRenderCell(element);
    }
    unrenderCell(element) {
        super.unrenderCell(element);
    }
    updateInternalLayoutNow(element) { }
    dispose() {
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbENoYXRQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L2NlbGxQYXJ0cy9jaGF0L2NlbGxDaGF0UGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFFbkQsTUFBTSxPQUFPLFlBQWEsU0FBUSxlQUFlO0lBQ2hELCtEQUErRDtJQUUvRCxJQUFJLFVBQVU7UUFDYixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUE7SUFDeEIsQ0FBQztJQUVELFlBQVksZUFBd0MsRUFBRSxjQUEyQjtRQUNoRixLQUFLLEVBQUUsQ0FBQTtJQUNSLENBQUM7SUFFUSxhQUFhLENBQUMsT0FBdUI7UUFDN0MsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUM3QixDQUFDO0lBRVEsWUFBWSxDQUFDLE9BQXVCO1FBQzVDLEtBQUssQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDNUIsQ0FBQztJQUVRLHVCQUF1QixDQUFDLE9BQXVCLElBQVMsQ0FBQztJQUV6RCxPQUFPO1FBQ2YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7Q0FDRCJ9
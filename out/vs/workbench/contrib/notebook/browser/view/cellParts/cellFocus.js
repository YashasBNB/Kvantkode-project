/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../../../base/browser/dom.js';
import { CellContentPart } from '../cellPart.js';
export class CellFocusPart extends CellContentPart {
    constructor(containerElement, focusSinkElement, notebookEditor) {
        super();
        this._register(DOM.addDisposableListener(containerElement, DOM.EventType.FOCUS, () => {
            if (this.currentCell) {
                notebookEditor.focusElement(this.currentCell);
            }
        }, true));
        if (focusSinkElement) {
            this._register(DOM.addDisposableListener(focusSinkElement, DOM.EventType.FOCUS, () => {
                if (this.currentCell &&
                    this.currentCell.outputsViewModels.length) {
                    notebookEditor.focusNotebookCell(this.currentCell, 'output');
                }
            }));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEZvY3VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L2NlbGxQYXJ0cy9jZWxsRm9jdXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFHaEQsTUFBTSxPQUFPLGFBQWMsU0FBUSxlQUFlO0lBQ2pELFlBQ0MsZ0JBQTZCLEVBQzdCLGdCQUF5QyxFQUN6QyxjQUErQjtRQUUvQixLQUFLLEVBQUUsQ0FBQTtRQUVQLElBQUksQ0FBQyxTQUFTLENBQ2IsR0FBRyxDQUFDLHFCQUFxQixDQUN4QixnQkFBZ0IsRUFDaEIsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQ25CLEdBQUcsRUFBRTtZQUNKLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN0QixjQUFjLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUM5QyxDQUFDO1FBQ0YsQ0FBQyxFQUNELElBQUksQ0FDSixDQUNELENBQUE7UUFFRCxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLFNBQVMsQ0FDYixHQUFHLENBQUMscUJBQXFCLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO2dCQUNyRSxJQUNDLElBQUksQ0FBQyxXQUFXO29CQUNmLElBQUksQ0FBQyxXQUFpQyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFDL0QsQ0FBQztvQkFDRixjQUFjLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQTtnQkFDN0QsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=
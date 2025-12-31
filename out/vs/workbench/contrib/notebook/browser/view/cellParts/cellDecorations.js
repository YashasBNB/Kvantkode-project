/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../../../base/browser/dom.js';
import { CellContentPart } from '../cellPart.js';
export class CellDecorations extends CellContentPart {
    constructor(notebookEditor, rootContainer, decorationContainer) {
        super();
        this.notebookEditor = notebookEditor;
        this.rootContainer = rootContainer;
        this.decorationContainer = decorationContainer;
    }
    didRenderCell(element) {
        const removedClassNames = [];
        this.rootContainer.classList.forEach((className) => {
            if (/^nb\-.*$/.test(className)) {
                removedClassNames.push(className);
            }
        });
        removedClassNames.forEach((className) => {
            this.rootContainer.classList.remove(className);
        });
        this.decorationContainer.innerText = '';
        const generateCellTopDecorations = () => {
            this.decorationContainer.innerText = '';
            element
                .getCellDecorations()
                .filter((options) => options.topClassName !== undefined)
                .forEach((options) => {
                this.decorationContainer.append(DOM.$(`.${options.topClassName}`));
            });
        };
        this.cellDisposables.add(element.onCellDecorationsChanged((e) => {
            const modified = e.added.find((e) => e.topClassName) || e.removed.find((e) => e.topClassName);
            if (modified) {
                generateCellTopDecorations();
            }
        }));
        generateCellTopDecorations();
        this.registerDecorations();
    }
    registerDecorations() {
        if (!this.currentCell) {
            return;
        }
        this.cellDisposables.add(this.currentCell.onCellDecorationsChanged((e) => {
            e.added.forEach((options) => {
                if (options.className && this.currentCell) {
                    this.rootContainer.classList.add(options.className);
                }
            });
            e.removed.forEach((options) => {
                if (options.className && this.currentCell) {
                    this.rootContainer.classList.remove(options.className);
                }
            });
        }));
        this.currentCell.getCellDecorations().forEach((options) => {
            if (options.className && this.currentCell) {
                this.rootContainer.classList.add(options.className);
                this.notebookEditor.deltaCellContainerClassNames(this.currentCell.id, [options.className], [], this.currentCell.cellKind);
            }
            if (options.outputClassName && this.currentCell) {
                this.notebookEditor.deltaCellContainerClassNames(this.currentCell.id, [options.outputClassName], [], this.currentCell.cellKind);
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbERlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L2NlbGxQYXJ0cy9jZWxsRGVjb3JhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFFaEQsTUFBTSxPQUFPLGVBQWdCLFNBQVEsZUFBZTtJQUNuRCxZQUNVLGNBQXVDLEVBQ3ZDLGFBQTBCLEVBQzFCLG1CQUFnQztRQUV6QyxLQUFLLEVBQUUsQ0FBQTtRQUpFLG1CQUFjLEdBQWQsY0FBYyxDQUF5QjtRQUN2QyxrQkFBYSxHQUFiLGFBQWEsQ0FBYTtRQUMxQix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQWE7SUFHMUMsQ0FBQztJQUVRLGFBQWEsQ0FBQyxPQUF1QjtRQUM3QyxNQUFNLGlCQUFpQixHQUFhLEVBQUUsQ0FBQTtRQUN0QyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtZQUNsRCxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDaEMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ2xDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO1lBQ3ZDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUMvQyxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxT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
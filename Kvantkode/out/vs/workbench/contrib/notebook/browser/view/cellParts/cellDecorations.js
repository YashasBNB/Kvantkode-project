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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbERlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvY2VsbFBhcnRzL2NlbGxEZWNvcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFBO0FBRTVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUVoRCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxlQUFlO0lBQ25ELFlBQ1UsY0FBdUMsRUFDdkMsYUFBMEIsRUFDMUIsbUJBQWdDO1FBRXpDLEtBQUssRUFBRSxDQUFBO1FBSkUsbUJBQWMsR0FBZCxjQUFjLENBQXlCO1FBQ3ZDLGtCQUFhLEdBQWIsYUFBYSxDQUFhO1FBQzFCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBYTtJQUcxQyxDQUFDO0lBRVEsYUFBYSxDQUFDLE9BQXVCO1FBQzdDLE1BQU0saUJBQWlCLEdBQWEsRUFBRSxDQUFBO1FBQ3RDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO1lBQ2xELElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUNoQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDbEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDdkMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQy9DLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUE7UUFFdkMsTUFBTSwwQkFBMEIsR0FBRyxHQUFHLEVBQUU7WUFDdkMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUE7WUFFdkMsT0FBTztpQkFDTCxrQkFBa0IsRUFBRTtpQkFDcEIsTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsWUFBWSxLQUFLLFNBQVMsQ0FBQztpQkFDdkQsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ3BCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxZQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDcEUsQ0FBQyxDQUFDLENBQUE7UUFDSixDQUFDLENBQUE7UUFFRCxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FDdkIsT0FBTyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDdEMsTUFBTSxRQUFRLEdBQ2IsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBRTdFLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsMEJBQTBCLEVBQUUsQ0FBQTtZQUM3QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELDBCQUEwQixFQUFFLENBQUE7UUFDNUIsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7SUFDM0IsQ0FBQztJQUVPLG1CQUFtQjtRQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3ZCLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQ3ZCLElBQUksQ0FBQyxXQUFXLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMvQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUMzQixJQUFJLE9BQU8sQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUMzQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUNwRCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7WUFFRixDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUM3QixJQUFJLE9BQU8sQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUMzQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUN2RCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ3pELElBQUksT0FBTyxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQ25ELElBQUksQ0FBQyxjQUFjLENBQUMsNEJBQTRCLENBQy9DLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUNuQixDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFDbkIsRUFBRSxFQUNGLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUN6QixDQUFBO1lBQ0YsQ0FBQztZQUVELElBQUksT0FBTyxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ2pELElBQUksQ0FBQyxjQUFjLENBQUMsNEJBQTRCLENBQy9DLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUNuQixDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFDekIsRUFBRSxFQUNGLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUN6QixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNEIn0=
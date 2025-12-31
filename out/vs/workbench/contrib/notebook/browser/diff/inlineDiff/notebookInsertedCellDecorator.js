/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, DisposableStore, toDisposable, } from '../../../../../../base/common/lifecycle.js';
import { NotebookOverviewRulerLane } from '../../notebookBrowser.js';
import { overviewRulerAddedForeground } from '../../../../scm/common/quickDiff.js';
export class NotebookInsertedCellDecorator extends Disposable {
    constructor(notebookEditor) {
        super();
        this.notebookEditor = notebookEditor;
        this.decorators = this._register(new DisposableStore());
    }
    apply(diffInfo) {
        const model = this.notebookEditor.textModel;
        if (!model) {
            return;
        }
        const cells = diffInfo
            .filter((diff) => diff.type === 'insert')
            .map((diff) => model.cells[diff.modifiedCellIndex]);
        const ids = this.notebookEditor.deltaCellDecorations([], cells.map((cell) => ({
            handle: cell.handle,
            options: {
                className: 'nb-insertHighlight',
                outputClassName: 'nb-insertHighlight',
                overviewRuler: {
                    color: overviewRulerAddedForeground,
                    modelRanges: [],
                    includeOutput: true,
                    position: NotebookOverviewRulerLane.Full,
                },
            },
        })));
        this.clear();
        this.decorators.add(toDisposable(() => {
            if (!this.notebookEditor.isDisposed) {
                this.notebookEditor.deltaCellDecorations(ids, []);
            }
        }));
    }
    clear() {
        this.decorators.clear();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tJbnNlcnRlZENlbGxEZWNvcmF0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvaW5saW5lRGlmZi9ub3RlYm9va0luc2VydGVkQ2VsbERlY29yYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixZQUFZLEdBQ1osTUFBTSw0Q0FBNEMsQ0FBQTtBQUVuRCxPQUFPLEVBQW1CLHlCQUF5QixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDckYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFbEYsTUFBTSxPQUFPLDZCQUE4QixTQUFRLFVBQVU7SUFFNUQsWUFBNkIsY0FBK0I7UUFDM0QsS0FBSyxFQUFFLENBQUE7UUFEcUIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBRDNDLGVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtJQUduRSxDQUFDO0lBQ00sS0FBSyxDQUFDLFFBQXdCO1FBQ3BDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFBO1FBQzNDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsUUFBUTthQUNwQixNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDO2FBQ3hDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsb0JBQW9CLENBQ25ELEVBQUUsRUFDRixLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3BCLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNuQixPQUFPLEVBQUU7Z0JBQ1IsU0FBUyxFQUFFLG9CQUFvQjtnQkFDL0IsZUFBZSxFQUFFLG9CQUFvQjtnQkFDckMsYUFBYSxFQUFFO29CQUNkLEtBQUssRUFBRSw0QkFBNEI7b0JBQ25DLFdBQVcsRUFBRSxFQUFFO29CQUNmLGFBQWEsRUFBRSxJQUFJO29CQUNuQixRQUFRLEVBQUUseUJBQXlCLENBQUMsSUFBSTtpQkFDeEM7YUFDRDtTQUNELENBQUMsQ0FBQyxDQUNILENBQUE7UUFDRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDWixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FDbEIsWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUNqQixJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDckMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDbEQsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBQ00sS0FBSztRQUNYLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDeEIsQ0FBQztDQUNEIn0=
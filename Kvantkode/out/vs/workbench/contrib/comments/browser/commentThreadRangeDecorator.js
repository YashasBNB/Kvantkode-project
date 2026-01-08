/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { CommentThreadCollapsibleState, } from '../../../../editor/common/languages.js';
import { ModelDecorationOptions } from '../../../../editor/common/model/textModel.js';
class CommentThreadRangeDecoration {
    get id() {
        return this._decorationId;
    }
    set id(id) {
        this._decorationId = id;
    }
    constructor(range, options) {
        this.range = range;
        this.options = options;
    }
}
export class CommentThreadRangeDecorator extends Disposable {
    static { this.description = 'comment-thread-range-decorator'; }
    constructor(commentService) {
        super();
        this.decorationIds = [];
        this.activeDecorationIds = [];
        this.threadCollapseStateListeners = [];
        const decorationOptions = {
            description: CommentThreadRangeDecorator.description,
            isWholeLine: false,
            zIndex: 20,
            className: 'comment-thread-range',
            shouldFillLineOnLineBreak: true,
        };
        this.decorationOptions = ModelDecorationOptions.createDynamic(decorationOptions);
        const activeDecorationOptions = {
            description: CommentThreadRangeDecorator.description,
            isWholeLine: false,
            zIndex: 20,
            className: 'comment-thread-range-current',
            shouldFillLineOnLineBreak: true,
        };
        this.activeDecorationOptions = ModelDecorationOptions.createDynamic(activeDecorationOptions);
        this._register(commentService.onDidChangeCurrentCommentThread((thread) => {
            this.updateCurrent(thread);
        }));
        this._register(commentService.onDidUpdateCommentThreads(() => {
            this.updateCurrent(undefined);
        }));
    }
    updateCurrent(thread) {
        if (!this.editor ||
            (thread?.resource && thread.resource?.toString() !== this.editor.getModel()?.uri.toString())) {
            return;
        }
        this.currentThreadCollapseStateListener?.dispose();
        const newDecoration = [];
        if (thread) {
            const range = thread.range;
            if (range &&
                !(range.startLineNumber === range.endLineNumber && range.startColumn === range.endColumn)) {
                if (thread.collapsibleState === CommentThreadCollapsibleState.Expanded) {
                    this.currentThreadCollapseStateListener = thread.onDidChangeCollapsibleState((state) => {
                        if (state === CommentThreadCollapsibleState.Collapsed) {
                            this.updateCurrent(undefined);
                        }
                    });
                    newDecoration.push(new CommentThreadRangeDecoration(range, this.activeDecorationOptions));
                }
            }
        }
        this.editor.changeDecorations((changeAccessor) => {
            this.activeDecorationIds = changeAccessor.deltaDecorations(this.activeDecorationIds, newDecoration);
            newDecoration.forEach((decoration, index) => (decoration.id = this.decorationIds[index]));
        });
    }
    update(editor, commentInfos) {
        const model = editor?.getModel();
        if (!editor || !model) {
            return;
        }
        dispose(this.threadCollapseStateListeners);
        this.editor = editor;
        const commentThreadRangeDecorations = [];
        for (const info of commentInfos) {
            info.threads.forEach((thread) => {
                if (thread.isDisposed) {
                    return;
                }
                const range = thread.range;
                // We only want to show a range decoration when there's the range spans either multiple lines
                // or, when is spans multiple characters on the sample line
                if (!range ||
                    (range.startLineNumber === range.endLineNumber && range.startColumn === range.endColumn)) {
                    return;
                }
                this.threadCollapseStateListeners.push(thread.onDidChangeCollapsibleState(() => {
                    this.update(editor, commentInfos);
                }));
                if (thread.collapsibleState === CommentThreadCollapsibleState.Collapsed) {
                    return;
                }
                commentThreadRangeDecorations.push(new CommentThreadRangeDecoration(range, this.decorationOptions));
            });
        }
        editor.changeDecorations((changeAccessor) => {
            this.decorationIds = changeAccessor.deltaDecorations(this.decorationIds, commentThreadRangeDecorations);
            commentThreadRangeDecorations.forEach((decoration, index) => (decoration.id = this.decorationIds[index]));
        });
    }
    dispose() {
        dispose(this.threadCollapseStateListeners);
        this.currentThreadCollapseStateListener?.dispose();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFRocmVhZFJhbmdlRGVjb3JhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRUaHJlYWRSYW5nZURlY29yYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBR3ZGLE9BQU8sRUFFTiw2QkFBNkIsR0FDN0IsTUFBTSx3Q0FBd0MsQ0FBQTtBQUUvQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUdyRixNQUFNLDRCQUE0QjtJQUdqQyxJQUFXLEVBQUU7UUFDWixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDMUIsQ0FBQztJQUVELElBQVcsRUFBRSxDQUFDLEVBQXNCO1FBQ25DLElBQUksQ0FBQyxhQUFhLEdBQUcsRUFBRSxDQUFBO0lBQ3hCLENBQUM7SUFFRCxZQUNpQixLQUFhLEVBQ2IsT0FBK0I7UUFEL0IsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNiLFlBQU8sR0FBUCxPQUFPLENBQXdCO0lBQzdDLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTywyQkFBNEIsU0FBUSxVQUFVO2FBQzNDLGdCQUFXLEdBQUcsZ0NBQWdDLEFBQW5DLENBQW1DO0lBUzdELFlBQVksY0FBK0I7UUFDMUMsS0FBSyxFQUFFLENBQUE7UUFQQSxrQkFBYSxHQUFhLEVBQUUsQ0FBQTtRQUM1Qix3QkFBbUIsR0FBYSxFQUFFLENBQUE7UUFFbEMsaUNBQTRCLEdBQWtCLEVBQUUsQ0FBQTtRQUt2RCxNQUFNLGlCQUFpQixHQUE0QjtZQUNsRCxXQUFXLEVBQUUsMkJBQTJCLENBQUMsV0FBVztZQUNwRCxXQUFXLEVBQUUsS0FBSztZQUNsQixN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
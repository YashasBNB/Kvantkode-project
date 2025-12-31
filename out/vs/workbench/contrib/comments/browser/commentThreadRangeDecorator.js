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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFRocmVhZFJhbmdlRGVjb3JhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50VGhyZWFkUmFuZ2VEZWNvcmF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUd2RixPQUFPLEVBRU4sNkJBQTZCLEdBQzdCLE1BQU0sd0NBQXdDLENBQUE7QUFFL0MsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFHckYsTUFBTSw0QkFBNEI7SUFHakMsSUFBVyxFQUFFO1FBQ1osT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQzFCLENBQUM7SUFFRCxJQUFXLEVBQUUsQ0FBQyxFQUFzQjtRQUNuQyxJQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQTtJQUN4QixDQUFDO0lBRUQsWUFDaUIsS0FBYSxFQUNiLE9BQStCO1FBRC9CLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixZQUFPLEdBQVAsT0FBTyxDQUF3QjtJQUM3QyxDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQU8sMkJBQTRCLFNBQVEsVUFBVTthQUMzQyxnQkFBVyxHQUFHLGdDQUFnQyxBQUFuQyxDQUFtQztJQVM3RCxZQUFZLGNBQStCO1FBQzFDLEtBQUssRUFBRSxDQUFBO1FBUEEsa0JBQWEsR0FBYSxFQUFFLENBQUE7UUFDNUIsd0JBQW1CLEdBQWEsRUFBRSxDQUFBO1FBRWxDLGlDQUE0QixHQUFrQixFQUFFLENBQUE7UUFLdkQsTUFBTSxpQkFBaUIsR0FBNEI7WUFDbEQsV0FBVyxFQUFFLDJCQUEyQixDQUFDLFdBQVc7WUFDcEQsV0FBVyxFQUFFLEtBQUs7WUFDbEIsTUFBTSxF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
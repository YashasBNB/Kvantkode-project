/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Color } from '../../../../base/common/color.js';
import { OverviewRulerLane } from '../../../../editor/common/model.js';
import { ModelDecorationOptions } from '../../../../editor/common/model/textModel.js';
import { darken, editorBackground, editorForeground, listInactiveSelectionBackground, opaque, registerColor, } from '../../../../platform/theme/common/colorRegistry.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import { CommentThreadState } from '../../../../editor/common/languages.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
export const overviewRulerCommentingRangeForeground = registerColor('editorGutter.commentRangeForeground', {
    dark: opaque(listInactiveSelectionBackground, editorBackground),
    light: darken(opaque(listInactiveSelectionBackground, editorBackground), 0.05),
    hcDark: Color.white,
    hcLight: Color.black,
}, nls.localize('editorGutterCommentRangeForeground', 'Editor gutter decoration color for commenting ranges. This color should be opaque.'));
const overviewRulerCommentForeground = registerColor('editorOverviewRuler.commentForeground', overviewRulerCommentingRangeForeground, nls.localize('editorOverviewRuler.commentForeground', 'Editor overview ruler decoration color for resolved comments. This color should be opaque.'));
const overviewRulerCommentUnresolvedForeground = registerColor('editorOverviewRuler.commentUnresolvedForeground', overviewRulerCommentForeground, nls.localize('editorOverviewRuler.commentUnresolvedForeground', 'Editor overview ruler decoration color for unresolved comments. This color should be opaque.'));
const editorGutterCommentGlyphForeground = registerColor('editorGutter.commentGlyphForeground', { dark: editorForeground, light: editorForeground, hcDark: Color.black, hcLight: Color.white }, nls.localize('editorGutterCommentGlyphForeground', 'Editor gutter decoration color for commenting glyphs.'));
registerColor('editorGutter.commentUnresolvedGlyphForeground', editorGutterCommentGlyphForeground, nls.localize('editorGutterCommentUnresolvedGlyphForeground', 'Editor gutter decoration color for commenting glyphs for unresolved comment threads.'));
export class CommentGlyphWidget extends Disposable {
    static { this.description = 'comment-glyph-widget'; }
    constructor(editor, lineNumber) {
        super();
        this._onDidChangeLineNumber = this._register(new Emitter());
        this.onDidChangeLineNumber = this._onDidChangeLineNumber.event;
        this._commentsOptions = this.createDecorationOptions();
        this._editor = editor;
        this._commentsDecorations = this._editor.createDecorationsCollection();
        this._register(this._commentsDecorations.onDidChange((e) => {
            const range = this._commentsDecorations.length > 0 ? this._commentsDecorations.getRange(0) : null;
            if (range && range.endLineNumber !== this._lineNumber) {
                this._lineNumber = range.endLineNumber;
                this._onDidChangeLineNumber.fire(this._lineNumber);
            }
        }));
        this._register(toDisposable(() => this._commentsDecorations.clear()));
        this.setLineNumber(lineNumber);
    }
    createDecorationOptions() {
        const unresolved = this._threadState === CommentThreadState.Unresolved;
        const decorationOptions = {
            description: CommentGlyphWidget.description,
            isWholeLine: true,
            overviewRuler: {
                color: themeColorFromId(unresolved ? overviewRulerCommentUnresolvedForeground : overviewRulerCommentForeground),
                position: OverviewRulerLane.Center,
            },
            collapseOnReplaceEdit: true,
            linesDecorationsClassName: `comment-range-glyph comment-thread${unresolved ? '-unresolved' : ''}`,
        };
        return ModelDecorationOptions.createDynamic(decorationOptions);
    }
    setThreadState(state) {
        if (this._threadState !== state) {
            this._threadState = state;
            this._commentsOptions = this.createDecorationOptions();
            this._updateDecorations();
        }
    }
    _updateDecorations() {
        const commentsDecorations = [
            {
                range: {
                    startLineNumber: this._lineNumber,
                    startColumn: 1,
                    endLineNumber: this._lineNumber,
                    endColumn: 1,
                },
                options: this._commentsOptions,
            },
        ];
        this._commentsDecorations.set(commentsDecorations);
    }
    setLineNumber(lineNumber) {
        this._lineNumber = lineNumber;
        this._updateDecorations();
    }
    getPosition() {
        const range = this._commentsDecorations.length > 0 ? this._commentsDecorations.getRange(0) : null;
        return {
            position: {
                lineNumber: range ? range.endLineNumber : this._lineNumber,
                column: 1,
            },
            preference: [0 /* ContentWidgetPositionPreference.EXACT */],
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudEdseXBoV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRHbHlwaFdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQU14RCxPQUFPLEVBQTJCLGlCQUFpQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0YsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDckYsT0FBTyxFQUNOLE1BQU0sRUFDTixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEVBQ2hCLCtCQUErQixFQUMvQixNQUFNLEVBQ04sYUFBYSxHQUNiLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFcEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUQsTUFBTSxDQUFDLE1BQU0sc0NBQXNDLEdBQUcsYUFBYSxDQUNsRSxxQ0FBcUMsRUFDckM7SUFDQyxJQUFJLEVBQUUsTUFBTSxDQUFDLCtCQUErQixFQUFFLGdCQUFnQixDQUFDO0lBQy9ELEtBQUssRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLCtCQUErQixFQUFFLGdCQUFnQixDQUFDLEVBQUUsSUFBSSxDQUFDO0lBQzlFLE1BQU0sRUFBRSxLQUFLLENBQUMsS0FBSztJQUNuQixP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
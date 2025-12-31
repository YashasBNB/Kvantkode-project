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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudEdseXBoV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50R2x5cGhXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFNeEQsT0FBTyxFQUEyQixpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3JGLE9BQU8sRUFDTixNQUFNLEVBQ04sZ0JBQWdCLEVBQ2hCLGdCQUFnQixFQUNoQiwrQkFBK0IsRUFDL0IsTUFBTSxFQUNOLGFBQWEsR0FDYixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRXBGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTFELE1BQU0sQ0FBQyxNQUFNLHNDQUFzQyxHQUFHLGFBQWEsQ0FDbEUscUNBQXFDLEVBQ3JDO0lBQ0MsSUFBSSxFQUFFLE1BQU0sQ0FBQywrQkFBK0IsRUFBRSxnQkFBZ0IsQ0FBQztJQUMvRCxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQywrQkFBK0IsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLElBQUksQ0FBQztJQUM5RSxNQUFNLEVBQUUsS0FBSyxDQUFDLEtBQUs7SUFDbkIsT0FBTyxF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
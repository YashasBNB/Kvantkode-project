/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { autorunWithStore, derived, observableFromEvent, } from '../../../../../../../base/common/observable.js';
import { observableCodeEditor } from '../../../../../../browser/observableCodeEditor.js';
import { rangeIsSingleLine } from '../../../../../../browser/widget/diffEditor/components/diffEditorViewZones/diffEditorViewZones.js';
import { OffsetRange } from '../../../../../../common/core/offsetRange.js';
import { Range } from '../../../../../../common/core/range.js';
import { InjectedTextCursorStops, } from '../../../../../../common/model.js';
import { ModelDecorationOptions } from '../../../../../../common/model/textModel.js';
import { classNames } from '../utils/utils.js';
export class OriginalEditorInlineDiffView extends Disposable {
    static supportsInlineDiffRendering(mapping) {
        return allowsTrueInlineDiffRendering(mapping);
    }
    constructor(_originalEditor, _state, _modifiedTextModel) {
        super();
        this._originalEditor = _originalEditor;
        this._state = _state;
        this._modifiedTextModel = _modifiedTextModel;
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this.isHovered = observableCodeEditor(this._originalEditor).isTargetHovered((p) => p.target.type === 6 /* MouseTargetType.CONTENT_TEXT */ &&
            p.target.detail.injectedText?.options.attachedData instanceof InlineEditAttachedData &&
            p.target.detail.injectedText.options.attachedData.owner === this, this._store);
        this._tokenizationFinished = modelTokenizationFinished(this._modifiedTextModel);
        this._decorations = derived(this, (reader) => {
            const diff = this._state.read(reader);
            if (!diff) {
                return undefined;
            }
            const modified = diff.modifiedText;
            const showInline = diff.mode === 'insertionInline';
            const hasOneInnerChange = diff.diff.length === 1 && diff.diff[0].innerChanges?.length === 1;
            const showEmptyDecorations = true;
            const originalDecorations = [];
            const modifiedDecorations = [];
            const diffLineAddDecorationBackground = ModelDecorationOptions.register({
                className: 'inlineCompletions-line-insert',
                description: 'line-insert',
                isWholeLine: true,
                marginClassName: 'gutter-insert',
            });
            const diffLineDeleteDecorationBackground = ModelDecorationOptions.register({
                className: 'inlineCompletions-line-delete',
                description: 'line-delete',
                isWholeLine: true,
                marginClassName: 'gutter-delete',
            });
            const diffWholeLineDeleteDecoration = ModelDecorationOptions.register({
                className: 'inlineCompletions-char-delete',
                description: 'char-delete',
                isWholeLine: false,
            });
            const diffWholeLineAddDecoration = ModelDecorationOptions.register({
                className: 'inlineCompletions-char-insert',
                description: 'char-insert',
                isWholeLine: true,
            });
            const diffAddDecoration = ModelDecorationOptions.register({
                className: 'inlineCompletions-char-insert',
                description: 'char-insert',
                shouldFillLineOnLineBreak: true,
            });
            const diffAddDecorationEmpty = ModelDecorationOptions.register({
                className: 'inlineCompletions-char-insert diff-range-empty',
                description: 'char-insert diff-range-empty',
            });
            for (const m of diff.diff) {
                const showFullLineDecorations = diff.mode !== 'sideBySide' && diff.mode !== 'deletion' && diff.mode !== 'insertionInline';
                if (showFullLineDecorations) {
                    if (!m.original.isEmpty) {
                        originalDecorations.push({
                            range: m.original.toInclusiveRange(),
                            options: diffLineDeleteDecorationBackground,
                        });
                    }
                    if (!m.modified.isEmpty) {
                        modifiedDecorations.push({
                            range: m.modified.toInclusiveRange(),
                            options: diffLineAddDecorationBackground,
                        });
                    }
                }
                if (m.modified.isEmpty || m.original.isEmpty) {
                    if (!m.original.isEmpty) {
                        originalDecorations.push({
                            range: m.original.toInclusiveRange(),
                            options: diffWholeLineDeleteDecoration,
                        });
                    }
                    if (!m.modified.isEmpty) {
                        modifiedDecorations.push({
                            range: m.modified.toInclusiveRange(),
                            options: diffWholeLineAddDecoration,
                        });
                    }
                }
                else {
                    const useInlineDiff = showInline && allowsTrueInlineDiffRendering(m);
                    for (const i of m.innerChanges || []) {
                        // Don't show empty markers outside the line range
                        if (m.original.contains(i.originalRange.startLineNumber)) {
                            const replacedText = this._originalEditor
                                .getModel()
                                ?.getValueInRange(i.originalRange, 1 /* EndOfLinePreference.LF */);
                            originalDecorations.push({
                                range: i.originalRange,
                                options: {
                                    description: 'char-delete',
                                    shouldFillLineOnLineBreak: false,
                                    className: classNames('inlineCompletions-char-delete', i.originalRange.isSingleLine() &&
                                        diff.mode === 'insertionInline' &&
                                        'single-line-inline', i.originalRange.isEmpty() && 'empty', ((i.originalRange.isEmpty() && hasOneInnerChange) ||
                                        (diff.mode === 'deletion' && replacedText === '\n')) &&
                                        showEmptyDecorations &&
                                        !useInlineDiff &&
                                        'diff-range-empty'),
                                    inlineClassName: useInlineDiff
                                        ? classNames('strike-through', 'inlineCompletions')
                                        : null,
                                    zIndex: 1,
                                },
                            });
                        }
                        if (m.modified.contains(i.modifiedRange.startLineNumber)) {
                            modifiedDecorations.push({
                                range: i.modifiedRange,
                                options: i.modifiedRange.isEmpty() &&
                                    showEmptyDecorations &&
                                    !useInlineDiff &&
                                    hasOneInnerChange
                                    ? diffAddDecorationEmpty
                                    : diffAddDecoration,
                            });
                        }
                        if (useInlineDiff) {
                            const insertedText = modified.getValueOfRange(i.modifiedRange);
                            // when the injected text becomes long, the editor will split it into multiple spans
                            // to be able to get the border around the start and end of the text, we need to split it into multiple segments
                            const textSegments = insertedText.length > 3
                                ? [
                                    {
                                        text: insertedText.slice(0, 1),
                                        extraClasses: ['start'],
                                        offsetRange: new OffsetRange(i.modifiedRange.startColumn - 1, i.modifiedRange.startColumn),
                                    },
                                    {
                                        text: insertedText.slice(1, -1),
                                        extraClasses: [],
                                        offsetRange: new OffsetRange(i.modifiedRange.startColumn, i.modifiedRange.endColumn - 2),
                                    },
                                    {
                                        text: insertedText.slice(-1),
                                        extraClasses: ['end'],
                                        offsetRange: new OffsetRange(i.modifiedRange.endColumn - 2, i.modifiedRange.endColumn - 1),
                                    },
                                ]
                                : [
                                    {
                                        text: insertedText,
                                        extraClasses: ['start', 'end'],
                                        offsetRange: new OffsetRange(i.modifiedRange.startColumn - 1, i.modifiedRange.endColumn),
                                    },
                                ];
                            // Tokenization
                            this._tokenizationFinished.read(reader); // reconsider when tokenization is finished
                            const lineTokens = this._modifiedTextModel.tokenization.getLineTokens(i.modifiedRange.startLineNumber);
                            for (const { text, extraClasses, offsetRange } of textSegments) {
                                originalDecorations.push({
                                    range: Range.fromPositions(i.originalRange.getEndPosition()),
                                    options: {
                                        description: 'inserted-text',
                                        before: {
                                            tokens: lineTokens.getTokensInRange(offsetRange),
                                            content: text,
                                            inlineClassName: classNames('inlineCompletions-char-insert', i.modifiedRange.isSingleLine() &&
                                                diff.mode === 'insertionInline' &&
                                                'single-line-inline', ...extraClasses),
                                            cursorStops: InjectedTextCursorStops.None,
                                            attachedData: new InlineEditAttachedData(this),
                                        },
                                        zIndex: 2,
                                        showIfCollapsed: true,
                                    },
                                });
                            }
                        }
                    }
                }
            }
            return { originalDecorations, modifiedDecorations };
        });
        this._register(observableCodeEditor(this._originalEditor).setDecorations(this._decorations.map((d) => d?.originalDecorations ?? [])));
        const modifiedCodeEditor = this._state.map((s) => s?.modifiedCodeEditor);
        this._register(autorunWithStore((reader, store) => {
            const e = modifiedCodeEditor.read(reader);
            if (e) {
                store.add(observableCodeEditor(e).setDecorations(this._decorations.map((d) => d?.modifiedDecorations ?? [])));
            }
        }));
        this._register(this._originalEditor.onMouseUp((e) => {
            if (e.target.type !== 6 /* MouseTargetType.CONTENT_TEXT */) {
                return;
            }
            const a = e.target.detail.injectedText?.options.attachedData;
            if (a instanceof InlineEditAttachedData && a.owner === this) {
                this._onDidClick.fire(e.event);
            }
        }));
    }
}
class InlineEditAttachedData {
    constructor(owner) {
        this.owner = owner;
    }
}
function allowsTrueInlineDiffRendering(mapping) {
    if (!mapping.innerChanges) {
        return false;
    }
    return mapping.innerChanges.every((c) => rangeIsSingleLine(c.modifiedRange) && rangeIsSingleLine(c.originalRange));
}
let i = 0;
function modelTokenizationFinished(model) {
    return observableFromEvent(model.onDidChangeTokens, () => i++);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3JpZ2luYWxFZGl0b3JJbmxpbmVEaWZmVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRzVmlld3Mvb3JpZ2luYWxFZGl0b3JJbmxpbmVEaWZmVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzFFLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsT0FBTyxFQUVQLG1CQUFtQixHQUNuQixNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1HQUFtRyxDQUFBO0FBQ3JJLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFHOUQsT0FBTyxFQUdOLHVCQUF1QixHQUV2QixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRXBGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQVU5QyxNQUFNLE9BQU8sNEJBQTZCLFNBQVEsVUFBVTtJQUNwRCxNQUFNLENBQUMsMkJBQTJCLENBQUMsT0FBaUM7UUFDMUUsT0FBTyw2QkFBNkIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBZUQsWUFDa0IsZUFBNEIsRUFDNUIsTUFBbUUsRUFDbkUsa0JB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
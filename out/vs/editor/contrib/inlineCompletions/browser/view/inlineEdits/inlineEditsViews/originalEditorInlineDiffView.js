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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3JpZ2luYWxFZGl0b3JJbmxpbmVEaWZmVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9pbmxpbmVFZGl0c1ZpZXdzL29yaWdpbmFsRWRpdG9ySW5saW5lRGlmZlZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUMxRSxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLE9BQU8sRUFFUCxtQkFBbUIsR0FDbkIsTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtR0FBbUcsQ0FBQTtBQUNySSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDMUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRzlELE9BQU8sRUFHTix1QkFBdUIsR0FFdkIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUVwRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFVOUMsTUFBTSxPQUFPLDRCQUE2QixTQUFRLFVBQVU7SUFDcEQsTUFBTSxDQUFDLDJCQUEyQixDQUFDLE9BQWlDO1FBQzFFLE9BQU8sNkJBQTZCLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDOUMsQ0FBQztJQWVELFlBQ2tCLGVBQTRCLEVBQzVCLE1BQW1FLEVBQ25FLGtCQUE4QjtR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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { n } from '../../../../../../../base/browser/dom.js';
import { Emitter } from '../../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { constObservable, derived, derivedObservableWithCache, } from '../../../../../../../base/common/observable.js';
import { editorBackground } from '../../../../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { observableCodeEditor, } from '../../../../../../browser/observableCodeEditor.js';
import { Rect } from '../../../../../../browser/rect.js';
import { OffsetRange } from '../../../../../../common/core/offsetRange.js';
import { Position } from '../../../../../../common/core/position.js';
import { getOriginalBorderColor, originalBackgroundColor } from '../theme.js';
import { getPrefixTrim, mapOutFalsy, maxContentWidthInRange } from '../utils/utils.js';
const HORIZONTAL_PADDING = 0;
const VERTICAL_PADDING = 0;
const BORDER_WIDTH = 1;
const WIDGET_SEPARATOR_WIDTH = 1;
const BORDER_RADIUS = 4;
export class InlineEditsDeletionView extends Disposable {
    constructor(_editor, _edit, _uiState, _tabAction) {
        super();
        this._editor = _editor;
        this._edit = _edit;
        this._uiState = _uiState;
        this._tabAction = _tabAction;
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._display = derived(this, (reader) => !!this._uiState.read(reader) ? 'block' : 'none');
        this._editorMaxContentWidthInRange = derived(this, (reader) => {
            const originalDisplayRange = this._originalDisplayRange.read(reader);
            if (!originalDisplayRange) {
                return constObservable(0);
            }
            this._editorObs.versionId.read(reader);
            // Take the max value that we observed.
            // Reset when either the edit changes or the editor text version.
            return derivedObservableWithCache(this, (reader, lastValue) => {
                const maxWidth = maxContentWidthInRange(this._editorObs, originalDisplayRange, reader);
                return Math.max(maxWidth, lastValue ?? 0);
            });
        }).map((v, r) => v.read(r));
        this._maxPrefixTrim = derived((reader) => {
            const state = this._uiState.read(reader);
            if (!state) {
                return { prefixTrim: 0, prefixLeftOffset: 0 };
            }
            return getPrefixTrim(state.deletions, state.originalRange, [], this._editor);
        });
        this._editorLayoutInfo = derived(this, (reader) => {
            const inlineEdit = this._edit.read(reader);
            if (!inlineEdit) {
                return null;
            }
            const state = this._uiState.read(reader);
            if (!state) {
                return null;
            }
            const editorLayout = this._editorObs.layoutInfo.read(reader);
            const horizontalScrollOffset = this._editorObs.scrollLeft.read(reader);
            const w = this._editorObs
                .getOption(52 /* EditorOption.fontInfo */)
                .map((f) => f.typicalHalfwidthCharacterWidth)
                .read(reader);
            const right = editorLayout.contentLeft +
                Math.max(this._editorMaxContentWidthInRange.read(reader), w) -
                horizontalScrollOffset;
            const range = inlineEdit.originalLineRange;
            const selectionTop = this._originalVerticalStartPosition.read(reader) ??
                this._editor.getTopForLineNumber(range.startLineNumber) -
                    this._editorObs.scrollTop.read(reader);
            const selectionBottom = this._originalVerticalEndPosition.read(reader) ??
                this._editor.getTopForLineNumber(range.endLineNumberExclusive) -
                    this._editorObs.scrollTop.read(reader);
            const left = editorLayout.contentLeft +
                this._maxPrefixTrim.read(reader).prefixLeftOffset -
                horizontalScrollOffset;
            if (right <= left) {
                return null;
            }
            const codeRect = Rect.fromLeftTopRightBottom(left, selectionTop, right, selectionBottom).withMargin(VERTICAL_PADDING, HORIZONTAL_PADDING);
            return {
                codeRect,
                contentLeft: editorLayout.contentLeft,
            };
        }).recomputeInitiallyAndOnChange(this._store);
        this._originalOverlay = n
            .div({
            style: { pointerEvents: 'none' },
        }, derived((reader) => {
            const layoutInfoObs = mapOutFalsy(this._editorLayoutInfo).read(reader);
            if (!layoutInfoObs) {
                return undefined;
            }
            // Create an overlay which hides the left hand side of the original overlay when it overflows to the left
            // such that there is a smooth transition at the edge of content left
            const overlayhider = layoutInfoObs.map((layoutInfo) => Rect.fromLeftTopRightBottom(layoutInfo.contentLeft - BORDER_RADIUS - BORDER_WIDTH, layoutInfo.codeRect.top, layoutInfo.contentLeft, layoutInfo.codeRect.bottom));
            const overlayRect = derived((reader) => {
                const rect = layoutInfoObs.read(reader).codeRect;
                const overlayHider = overlayhider.read(reader);
                return rect.intersectHorizontal(new OffsetRange(overlayHider.left, Number.MAX_SAFE_INTEGER));
            });
            const separatorRect = overlayRect.map((rect) => rect.withMargin(WIDGET_SEPARATOR_WIDTH, WIDGET_SEPARATOR_WIDTH));
            return [
                n.div({
                    class: 'originalSeparatorDeletion',
                    style: {
                        ...separatorRect.read(reader).toStyles(),
                        borderRadius: `${BORDER_RADIUS}px`,
                        border: `${BORDER_WIDTH + WIDGET_SEPARATOR_WIDTH}px solid ${asCssVariable(editorBackground)}`,
                        boxSizing: 'border-box',
                    },
                }),
                n.div({
                    class: 'originalOverlayDeletion',
                    style: {
                        ...overlayRect.read(reader).toStyles(),
                        borderRadius: `${BORDER_RADIUS}px`,
                        border: getOriginalBorderColor(this._tabAction).map((bc) => `${BORDER_WIDTH}px solid ${asCssVariable(bc)}`),
                        boxSizing: 'border-box',
                        backgroundColor: asCssVariable(originalBackgroundColor),
                    },
                }),
                n.div({
                    class: 'originalOverlayHiderDeletion',
                    style: {
                        ...overlayhider.read(reader).toStyles(),
                        backgroundColor: asCssVariable(editorBackground),
                    },
                }),
            ];
        }))
            .keepUpdated(this._store);
        this._nonOverflowView = n
            .div({
            class: 'inline-edits-view',
            style: {
                position: 'absolute',
                overflow: 'visible',
                top: '0px',
                left: '0px',
                zIndex: '0',
                display: this._display,
            },
        }, [[this._originalOverlay]])
            .keepUpdated(this._store);
        this.isHovered = constObservable(false);
        this._editorObs = observableCodeEditor(this._editor);
        const originalStartPosition = derived(this, (reader) => {
            const inlineEdit = this._edit.read(reader);
            return inlineEdit ? new Position(inlineEdit.originalLineRange.startLineNumber, 1) : null;
        });
        const originalEndPosition = derived(this, (reader) => {
            const inlineEdit = this._edit.read(reader);
            return inlineEdit
                ? new Position(inlineEdit.originalLineRange.endLineNumberExclusive, 1)
                : null;
        });
        this._originalDisplayRange = this._uiState.map((s) => s?.originalRange);
        this._originalVerticalStartPosition = this._editorObs
            .observePosition(originalStartPosition, this._store)
            .map((p) => p?.y);
        this._originalVerticalEndPosition = this._editorObs
            .observePosition(originalEndPosition, this._store)
            .map((p) => p?.y);
        this._register(this._editorObs.createOverlayWidget({
            domNode: this._nonOverflowView.element,
            position: constObservable(null),
            allowEditorOverflow: false,
            minContentWidthInPx: derived((reader) => {
                const info = this._editorLayoutInfo.read(reader);
                if (info === null) {
                    return 0;
                }
                return info.codeRect.width;
            }),
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNEZWxldGlvblZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3ZpZXcvaW5saW5lRWRpdHMvaW5saW5lRWRpdHNWaWV3cy9pbmxpbmVFZGl0c0RlbGV0aW9uVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUMxRSxPQUFPLEVBQ04sZUFBZSxFQUNmLE9BQU8sRUFDUCwwQkFBMEIsR0FFMUIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUM5RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFeEYsT0FBTyxFQUVOLG9CQUFvQixHQUNwQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUd4RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBSXBFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBRXRGLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxDQUFBO0FBQzVCLE1BQU0sZ0JBQWdCLEdBQUcs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
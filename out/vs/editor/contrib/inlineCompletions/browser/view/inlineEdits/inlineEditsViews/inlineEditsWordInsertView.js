/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { n } from '../../../../../../../base/browser/dom.js';
import { Emitter } from '../../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { constObservable, derived, } from '../../../../../../../base/common/observable.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { Point } from '../../../../../../browser/point.js';
import { Rect } from '../../../../../../browser/rect.js';
import { OffsetRange } from '../../../../../../common/core/offsetRange.js';
import { getModifiedBorderColor } from '../theme.js';
import { mapOutFalsy, rectToProps } from '../utils/utils.js';
export class InlineEditsWordInsertView extends Disposable {
    constructor(_editor, 
    /** Must be single-line in both sides */
    _edit, _tabAction) {
        super();
        this._editor = _editor;
        this._edit = _edit;
        this._tabAction = _tabAction;
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._start = this._editor.observePosition(constObservable(this._edit.range.getStartPosition()), this._store);
        this._layout = derived(this, (reader) => {
            const start = this._start.read(reader);
            if (!start) {
                return undefined;
            }
            const contentLeft = this._editor.layoutInfoContentLeft.read(reader);
            const lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */).read(reader);
            const w = this._editor
                .getOption(52 /* EditorOption.fontInfo */)
                .read(reader).typicalHalfwidthCharacterWidth;
            const width = this._edit.text.length * w + 5;
            const center = new Point(contentLeft + start.x + w / 2 - this._editor.scrollLeft.read(reader), start.y);
            const modified = Rect.fromLeftTopWidthHeight(center.x - width / 2, center.y + lineHeight + 5, width, lineHeight);
            const background = Rect.hull([Rect.fromPoint(center), modified]).withMargin(4);
            return {
                modified,
                center,
                background,
                lowerBackground: background.intersectVertical(new OffsetRange(modified.top - 2, Number.MAX_SAFE_INTEGER)),
            };
        });
        this._div = n
            .div({
            class: 'word-insert',
        }, [
            derived((reader) => {
                const layout = mapOutFalsy(this._layout).read(reader);
                if (!layout) {
                    return [];
                }
                const modifiedBorderColor = asCssVariable(getModifiedBorderColor(this._tabAction).read(reader));
                return [
                    n.div({
                        style: {
                            position: 'absolute',
                            ...rectToProps((reader) => layout.read(reader).lowerBackground),
                            borderRadius: '4px',
                            background: 'var(--vscode-editor-background)',
                        },
                    }, []),
                    n.div({
                        style: {
                            position: 'absolute',
                            ...rectToProps((reader) => layout.read(reader).modified),
                            borderRadius: '4px',
                            padding: '0px',
                            textAlign: 'center',
                            background: 'var(--vscode-inlineEdit-modifiedChangedTextBackground)',
                            fontFamily: this._editor.getOption(51 /* EditorOption.fontFamily */),
                            fontSize: this._editor.getOption(54 /* EditorOption.fontSize */),
                            fontWeight: this._editor.getOption(55 /* EditorOption.fontWeight */),
                        },
                    }, [this._edit.text]),
                    n.div({
                        style: {
                            position: 'absolute',
                            ...rectToProps((reader) => layout.read(reader).background),
                            borderRadius: '4px',
                            border: `1px solid ${modifiedBorderColor}`,
                            //background: 'rgba(122, 122, 122, 0.12)', looks better
                            background: 'var(--vscode-inlineEdit-wordReplacementView-background)',
                        },
                    }, []),
                    n.svg({
                        viewBox: '0 0 12 18',
                        width: 12,
                        height: 18,
                        fill: 'none',
                        style: {
                            position: 'absolute',
                            left: derived((reader) => layout.read(reader).center.x - 9),
                            top: derived((reader) => layout.read(reader).center.y + 4),
                            transform: 'scale(1.4, 1.4)',
                        },
                    }, [
                        n.svgElem('path', {
                            d: 'M5.06445 0H7.35759C7.35759 0 7.35759 8.47059 7.35759 11.1176C7.35759 13.7647 9.4552 18 13.4674 18C17.4795 18 -2.58445 18 0.281373 18C3.14719 18 5.06477 14.2941 5.06477 11.1176C5.06477 7.94118 5.06445 0 5.06445 0Z',
                            fill: 'var(--vscode-inlineEdit-modifiedChangedTextBackground)',
                        }),
                    ]),
                ];
            }),
        ])
            .keepUpdated(this._store);
        this.isHovered = constObservable(false);
        this._register(this._editor.createOverlayWidget({
            domNode: this._div.element,
            minContentWidthInPx: constObservable(0),
            position: constObservable({ preference: { top: 0, left: 0 } }),
            allowEditorOverflow: false,
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNXb3JkSW5zZXJ0Vmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9pbmxpbmVFZGl0c1ZpZXdzL2lubGluZUVkaXRzV29yZEluc2VydFZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRTVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDMUUsT0FBTyxFQUNOLGVBQWUsRUFDZixPQUFPLEdBRVAsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFeEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFHMUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sYUFBYSxDQUFBO0FBQ3BELE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFFNUQsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFVBQVU7SUFrSXhELFlBQ2tCLE9BQTZCO0lBQzlDLHdDQUF3QztJQUN2QixLQUFxQixFQUNyQixVQUE0QztRQUU3RCxLQUFLLEVBQUUsQ0FBQTtRQUxVLFlBQU8sR0FBUCxPQUFPLENBQXNCO1FBRTdCLFVBQUssR0FBTCxLQUFLLENBQWdCO1FBQ3JCLGVBQVUsR0FBVixV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
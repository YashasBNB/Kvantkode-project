/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { n } from '../../../../../../../base/browser/dom.js';
import { Emitter } from '../../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { constObservable, derived, } from '../../../../../../../base/common/observable.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { observableCodeEditor, } from '../../../../../../browser/observableCodeEditor.js';
import { Point } from '../../../../../../browser/point.js';
import { singleTextRemoveCommonPrefix } from '../../../model/singleTextEditHelpers.js';
import { inlineEditIndicatorPrimaryBorder } from '../theme.js';
import { PathBuilder } from '../utils/utils.js';
export class InlineEditsCollapsedView extends Disposable {
    constructor(_editor, _edit) {
        super();
        this._editor = _editor;
        this._edit = _edit;
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this.isHovered = constObservable(false);
        this._editorObs = observableCodeEditor(this._editor);
        const firstEdit = this._edit.map((inlineEdit) => inlineEdit?.edit.edits[0] ?? null);
        const startPosition = firstEdit.map((edit) => edit
            ? singleTextRemoveCommonPrefix(edit, this._editor.getModel()).range.getStartPosition()
            : null);
        const observedStartPoint = this._editorObs.observePosition(startPosition, this._store);
        const startPoint = derived((reader) => {
            const point = observedStartPoint.read(reader);
            if (!point) {
                return null;
            }
            const contentLeft = this._editorObs.layoutInfoContentLeft.read(reader);
            const scrollLeft = this._editorObs.scrollLeft.read(reader);
            return new Point(contentLeft + point.x - scrollLeft, point.y);
        });
        const overlayElement = n
            .div({
            class: 'inline-edits-collapsed-view',
            style: {
                position: 'absolute',
                overflow: 'visible',
                top: '0px',
                left: '0px',
                zIndex: '0',
                display: 'block',
            },
        }, [[this.getCollapsedIndicator(startPoint)]])
            .keepUpdated(this._store).element;
        this._register(this._editorObs.createOverlayWidget({
            domNode: overlayElement,
            position: constObservable(null),
            allowEditorOverflow: false,
            minContentWidthInPx: constObservable(0),
        }));
    }
    getCollapsedIndicator(startPoint) {
        const contentLeft = this._editorObs.layoutInfoContentLeft;
        const startPointTranslated = startPoint.map((p, reader) => p ? p.deltaX(-contentLeft.read(reader)) : null);
        const iconPath = this.createIconPath(startPointTranslated);
        return n.svg({
            class: 'collapsedView',
            style: {
                position: 'absolute',
                top: 0,
                left: contentLeft,
                width: this._editorObs.contentWidth,
                height: this._editorObs.editor.getContentHeight(),
                overflow: 'hidden',
                pointerEvents: 'none',
            },
        }, [
            n.svgElem('path', {
                class: 'collapsedViewPath',
                d: iconPath,
                fill: asCssVariable(inlineEditIndicatorPrimaryBorder),
            }),
        ]);
    }
    createIconPath(indicatorPoint) {
        const width = 6;
        const triangleHeight = 3;
        const baseHeight = 1;
        return indicatorPoint.map((point) => {
            if (!point) {
                return new PathBuilder().build();
            }
            const baseTopLeft = point.deltaX(-width / 2).deltaY(-baseHeight);
            const baseTopRight = baseTopLeft.deltaX(width);
            const baseBottomLeft = baseTopLeft.deltaY(baseHeight);
            const baseBottomRight = baseTopRight.deltaY(baseHeight);
            const triangleBottomCenter = baseBottomLeft.deltaX(width / 2).deltaY(triangleHeight);
            return new PathBuilder()
                .moveTo(baseTopLeft)
                .lineTo(baseTopRight)
                .lineTo(baseBottomRight)
                .lineTo(triangleBottomCenter)
                .lineTo(baseBottomLeft)
                .lineTo(baseTopLeft)
                .build();
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNDb2xsYXBzZWRWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRzVmlld3MvaW5saW5lRWRpdHNDb2xsYXBzZWRWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzFFLE9BQU8sRUFDTixlQUFlLEVBQ2YsT0FBTyxHQUVQLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRXhGLE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFHdEYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBQzlELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUUvQyxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsVUFBVTtJQU12RCxZQUNrQixPQUFvQixFQUNwQixLQUFxRDtRQUV0RSxLQUFLLEVBQUUsQ0FBQTtRQUhVLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFDcEIsVUFBSyxHQUFMLEtBQUssQ0FBZ0Q7UUFQdEQsZ0JBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFl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
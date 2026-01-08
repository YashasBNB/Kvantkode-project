/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { addDisposableListener, h } from '../../../../../../../base/browser/dom.js';
import { renderIcon } from '../../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { autorun, constObservable, } from '../../../../../../../base/common/observable.js';
import { localize } from '../../../../../../../nls.js';
import { buttonBackground, buttonForeground, buttonSeparator, } from '../../../../../../../platform/theme/common/colorRegistry.js';
import { registerColor } from '../../../../../../../platform/theme/common/colorUtils.js';
import { OffsetRange } from '../../../../../../common/core/offsetRange.js';
export const inlineEditIndicatorForeground = registerColor('inlineEdit.indicator.foreground', buttonForeground, localize('inlineEdit.indicator.foreground', 'Foreground color for the inline edit indicator.'));
export const inlineEditIndicatorBackground = registerColor('inlineEdit.indicator.background', buttonBackground, localize('inlineEdit.indicator.background', 'Background color for the inline edit indicator.'));
export const inlineEditIndicatorBorder = registerColor('inlineEdit.indicator.border', buttonSeparator, localize('inlineEdit.indicator.border', 'Border color for the inline edit indicator.'));
export class InlineEditsIndicator extends Disposable {
    constructor(_editorObs, _state, _model) {
        super();
        this._editorObs = _editorObs;
        this._state = _state;
        this._model = _model;
        this._indicator = h('div.inline-edits-view-indicator', {
            style: {
                position: 'absolute',
                overflow: 'visible',
                cursor: 'pointer',
            },
        }, [h('div.icon', {}, [renderIcon(Codicon.arrowLeft)]), h('div.label', {}, [' inline edit'])]);
        this.isHoverVisible = constObservable(false);
        this._register(addDisposableListener(this._indicator.root, 'click', () => {
            this._model.get()?.jump();
        }));
        this._register(this._editorObs.createOverlayWidget({
            domNode: this._indicator.root,
            position: constObservable(null),
            allowEditorOverflow: false,
            minContentWidthInPx: constObservable(0),
        }));
        this._register(autorun((reader) => {
            const state = this._state.read(reader);
            if (!state) {
                this._indicator.root.style.visibility = 'hidden';
                return;
            }
            this._indicator.root.style.visibility = '';
            const i = this._editorObs.layoutInfo.read(reader);
            const range = new OffsetRange(0, i.height - 30);
            const topEdit = state.editTop;
            this._indicator.root.classList.toggle('top', topEdit < range.start);
            this._indicator.root.classList.toggle('bottom', topEdit > range.endExclusive);
            const showAnyway = state.showAlways;
            this._indicator.root.classList.toggle('visible', showAnyway);
            this._indicator.root.classList.toggle('contained', range.contains(topEdit));
            this._indicator.root.style.top = `${range.clip(topEdit)}px`;
            this._indicator.root.style.right = `${i.minimap.minimapWidth + i.verticalScrollbarWidth}px`;
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kaWNhdG9yVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2NvbXBvbmVudHMvaW5kaWNhdG9yVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsQ0FBQyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbkYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDMUUsT0FBTyxFQUVOLE9BQU8sRUFDUCxlQUFlLEdBQ2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDdEQsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixnQkFBZ0IsRUFDaEIsZUFBZSxHQUNmLE1BQU0sNkRBQTZELENBQUE7QUFDcEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRXhGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQU8xRSxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxhQUFhLENBQ3pELGlDQUFpQyxFQUNqQyxnQkFBZ0IsRUFDaEIsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLGlEQUFpRCxDQUFDLENBQzlGLENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxhQUFhLENBQ3pELGlDQUFpQyxFQUNqQyxnQkFBZ0IsRUFDaEIsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLGlEQUFpRCxDQUFDLENB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
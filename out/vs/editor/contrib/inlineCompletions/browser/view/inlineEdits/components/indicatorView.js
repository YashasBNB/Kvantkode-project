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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kaWNhdG9yVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9jb21wb25lbnRzL2luZGljYXRvclZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzFFLE9BQU8sRUFFTixPQUFPLEVBQ1AsZUFBZSxHQUNmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3RELE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEVBQ2hCLGVBQWUsR0FDZixNQUFNLDZEQUE2RCxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUV4RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFPMUUsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsYUFBYSxDQUN6RCxpQ0FBaUMsRUFDakMsZ0JBQWdCLEVBQ2hCLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSxpREFBaUQsQ0FBQyxDQUM5RixDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsYUFBYSxDQUN6RCxpQ0FBaUMsRUFDakMsZ0JBQWdCLEVBQ2hCLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSxpREFBaUQsQ0FBQyxDQUM5RixD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
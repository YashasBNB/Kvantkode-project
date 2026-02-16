/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/gettingStarted.css';
import { localize } from '../../../../nls.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { URI } from '../../../../base/common/uri.js';
import { Schemas } from '../../../../base/common/network.js';
export const gettingStartedInputTypeId = 'workbench.editors.gettingStartedInput';
export class GettingStartedInput extends EditorInput {
    static { this.ID = gettingStartedInputTypeId; }
    static { this.RESOURCE = URI.from({
        scheme: Schemas.walkThrough,
        authority: 'vscode_getting_started_page',
    }); }
    get typeId() {
        return GettingStartedInput.ID;
    }
    get editorId() {
        return this.typeId;
    }
    toUntyped() {
        return {
            resource: GettingStartedInput.RESOURCE,
            options: {
                override: GettingStartedInput.ID,
                pinned: false,
            },
        };
    }
    get resource() {
        return GettingStartedInput.RESOURCE;
    }
    matches(other) {
        if (super.matches(other)) {
            return true;
        }
        if (other instanceof GettingStartedInput) {
            return other.selectedCategory === this.selectedCategory;
        }
        return false;
    }
    constructor(options) {
        super();
        this._selectedCategory = options.selectedCategory;
        this._selectedStep = options.selectedStep;
        this._showTelemetryNotice = !!options.showTelemetryNotice;
        this._showWelcome = options.showWelcome ?? true;
        this._walkthroughPageTitle = options.walkthroughPageTitle;
    }
    getName() {
        return this.walkthroughPageTitle
            ? localize('walkthroughPageTitle', 'Walkthrough: {0}', this.walkthroughPageTitle)
            : localize('getStarted', 'Welcome');
    }
    get selectedCategory() {
        return this._selectedCategory;
    }
    set selectedCategory(selectedCategory) {
        this._selectedCategory = selectedCategory;
        this._onDidChangeLabel.fire();
    }
    get selectedStep() {
        return this._selectedStep;
    }
    set selectedStep(selectedStep) {
        this._selectedStep = selectedStep;
    }
    get showTelemetryNotice() {
        return this._showTelemetryNotice;
    }
    set showTelemetryNotice(value) {
        this._showTelemetryNotice = value;
    }
    get showWelcome() {
        return this._showWelcome;
    }
    set showWelcome(value) {
        this._showWelcome = value;
    }
    get walkthroughPageTitle() {
        return this._walkthroughPageTitle;
    }
    set walkthroughPageTitle(value) {
        this._walkthroughPageTitle = value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZUdldHRpbmdTdGFydGVkL2Jyb3dzZXIvZ2V0dGluZ1N0YXJ0ZWRJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUk1RCxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyx1Q0FBdUMsQ0FBQTtBQVVoRixNQUFNLE9BQU8sbUJBQW9CLFNBQVEsV0FBVzthQUNuQyxPQUFFLEdBQUcseUJBQXlCLENBQUE7YUFDOUIsYUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFDbkMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxXQUFXO1FBQzNCLFNBQVMsRUFBRSw2QkFBNkI7S0FDeEMsQ0FBQyxDQUFBO0lBT0YsSUFBYSxNQUFNO1FBQ2xCLE9BQU8sbUJBQW1CLENBQUMsRUFBRSxDQUFBO0lBQzlCLENBQUM7SUFFRCxJQUFhLFFBQVE7UUFDcEIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7SUFFUSxTQUFTO1FBQ2pCLE9BQU87WUFDTixRQUFRLEVBQUUsbUJBQW1CLENBQUMsUUFBUTtZQUN0QyxPQUFPLEVBQUU7Z0JBQ1IsUUFBUSxFQUFFLG1CQUFtQixDQUFDLEVBQUU7Z0JBQ2hDLE1BQU0sRUFBRSxLQUFL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
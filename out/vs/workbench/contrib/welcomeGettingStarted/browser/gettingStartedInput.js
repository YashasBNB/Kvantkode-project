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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVHZXR0aW5nU3RhcnRlZC9icm93c2VyL2dldHRpbmdTdGFydGVkSW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFJNUQsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsdUNBQXVDLENBQUE7QUFVaEYsTUFBTSxPQUFPLG1CQUFvQixTQUFRLFdBQVc7YUFDbkMsT0FBRSxHQUFHLHlCQUF5QixDQUFBO2FBQzlCLGFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ25DLE1BQU0sRUFBRSxPQUFPLENBQUMsV0FBVztRQUMzQixTQUFTLEVBQUUsNkJBQTZCO0tBQ3hDLENBQUMsQ0FBQTtJQU9GLElBQWEsTUFBTTtRQUNsQixPQUFPLG1CQUFtQixDQUFDLEVBQUUsQ0FBQTtJQUM5QixDQUFDO0lBRUQsSUFBYSxRQUFRO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUNuQixDQUFDO0lBRVEsU0FBUztRQUNqQixPQUFPO1lBQ04sUUFBUSxFQUFFLG1CQUFtQixDQUFDLFFBQVE7WUFDdEMsT0FBTyxFQUFFO2dCQUNSLFFBQVEsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFO2dCQUNoQyxNQUFNLEVBQUUsS0FBSzthQUNiO1NBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDWCxPQUFPLG1CQUFtQixDQUFDLFFBQVEsQ0FBQTtJQUNwQyxDQUFDO0lBRVEsT0FBTyxDQUFDLEtBQXdDO1FBQ3hELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzFCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELElBQUksS0FBSyxZQUFZLG1CQUFtQixFQUFFLENBQUM7WUFDMUMsT0FBTyxLQUFLLENBQUMsZ0JBQWdCLEtBQUssSUFBSSxDQUFDLGdCQUFnQixDQUFBO1FBQ3hELENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxZQUFZLE9BQW9DO1FBQy9DLEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQTtRQUNqRCxJQUFJLENBQUMsYUFBYSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUE7UUFDekMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUE7UUFDekQsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQTtRQUMvQyxJQUFJLENBQUMscUJBQXFCLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFBO0lBQzFELENBQUM7SUFFUSxPQUFPO1FBQ2YsT0FBTyxJQUFJLENBQUMsb0JBQW9CO1lBQy9CLENBQUMsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDO1lBQ2pGLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFRCxJQUFJLGdCQUFnQjtRQUNuQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtJQUM5QixDQUFDO0lBRUQsSUFBSSxnQkFBZ0IsQ0FBQyxnQkFBb0M7UUFDeEQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGdCQUFnQixDQUFBO1FBQ3pDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUM5QixDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQzFCLENBQUM7SUFFRCxJQUFJLFlBQVksQ0FBQyxZQUFnQztRQUNoRCxJQUFJLENBQUMsYUFBYSxHQUFHLFlBQVksQ0FBQTtJQUNsQyxDQUFDO0lBRUQsSUFBSSxtQkFBbUI7UUFDdEIsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUE7SUFDakMsQ0FBQztJQUVELElBQUksbUJBQW1CLENBQUMsS0FBYztRQUNyQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsS0FBSyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUE7SUFDekIsQ0FBQztJQUVELElBQUksV0FBVyxDQUFDLEtBQWM7UUFDN0IsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUE7SUFDMUIsQ0FBQztJQUVELElBQUksb0JBQW9CO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFBO0lBQ2xDLENBQUM7SUFFRCxJQUFJLG9CQUFvQixDQUFDLEtBQXlCO1FBQ2pELElBQUksQ0FBQyxxQkFBcUIsR0FBRyxLQUFLLENBQUE7SUFDbkMsQ0FBQyJ9
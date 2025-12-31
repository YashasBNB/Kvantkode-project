/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { Schemas } from '../../../base/common/network.js';
export const NO_KEY_MODS = { ctrlCmd: false, alt: false };
export var QuickInputHideReason;
(function (QuickInputHideReason) {
    /**
     * Focus moved away from the quick input.
     */
    QuickInputHideReason[QuickInputHideReason["Blur"] = 1] = "Blur";
    /**
     * An explicit user gesture, e.g. pressing Escape key.
     */
    QuickInputHideReason[QuickInputHideReason["Gesture"] = 2] = "Gesture";
    /**
     * Anything else.
     */
    QuickInputHideReason[QuickInputHideReason["Other"] = 3] = "Other";
})(QuickInputHideReason || (QuickInputHideReason = {}));
/**
 * A collection of the different types of QuickInput
 */
export var QuickInputType;
(function (QuickInputType) {
    QuickInputType["QuickPick"] = "quickPick";
    QuickInputType["InputBox"] = "inputBox";
    QuickInputType["QuickWidget"] = "quickWidget";
})(QuickInputType || (QuickInputType = {}));
/**
 * Represents the activation behavior for items in a quick input. This means which item will be
 * "active" (aka focused).
 */
export var ItemActivation;
(function (ItemActivation) {
    /**
     * No item will be active.
     */
    ItemActivation[ItemActivation["NONE"] = 0] = "NONE";
    /**
     * First item will be active.
     */
    ItemActivation[ItemActivation["FIRST"] = 1] = "FIRST";
    /**
     * Second item will be active.
     */
    ItemActivation[ItemActivation["SECOND"] = 2] = "SECOND";
    /**
     * Last item will be active.
     */
    ItemActivation[ItemActivation["LAST"] = 3] = "LAST";
})(ItemActivation || (ItemActivation = {}));
/**
 * Represents the focus options for a quick pick.
 */
export var QuickPickFocus;
(function (QuickPickFocus) {
    /**
     * Focus the first item in the list.
     */
    QuickPickFocus[QuickPickFocus["First"] = 1] = "First";
    /**
     * Focus the second item in the list.
     */
    QuickPickFocus[QuickPickFocus["Second"] = 2] = "Second";
    /**
     * Focus the last item in the list.
     */
    QuickPickFocus[QuickPickFocus["Last"] = 3] = "Last";
    /**
     * Focus the next item in the list.
     */
    QuickPickFocus[QuickPickFocus["Next"] = 4] = "Next";
    /**
     * Focus the previous item in the list.
     */
    QuickPickFocus[QuickPickFocus["Previous"] = 5] = "Previous";
    /**
     * Focus the next page in the list.
     */
    QuickPickFocus[QuickPickFocus["NextPage"] = 6] = "NextPage";
    /**
     * Focus the previous page in the list.
     */
    QuickPickFocus[QuickPickFocus["PreviousPage"] = 7] = "PreviousPage";
    /**
     * Focus the first item under the next separator.
     */
    QuickPickFocus[QuickPickFocus["NextSeparator"] = 8] = "NextSeparator";
    /**
     * Focus the first item under the current separator.
     */
    QuickPickFocus[QuickPickFocus["PreviousSeparator"] = 9] = "PreviousSeparator";
})(QuickPickFocus || (QuickPickFocus = {}));
export var QuickInputButtonLocation;
(function (QuickInputButtonLocation) {
    /**
     * In the title bar.
     */
    QuickInputButtonLocation[QuickInputButtonLocation["Title"] = 1] = "Title";
    /**
     * To the right of the input box.
     */
    QuickInputButtonLocation[QuickInputButtonLocation["Inline"] = 2] = "Inline";
})(QuickInputButtonLocation || (QuickInputButtonLocation = {}));
export class QuickPickItemScorerAccessor {
    constructor(options) {
        this.options = options;
    }
    getItemLabel(entry) {
        return entry.label;
    }
    getItemDescription(entry) {
        if (this.options?.skipDescription) {
            return undefined;
        }
        return entry.description;
    }
    getItemPath(entry) {
        if (this.options?.skipPath) {
            return undefined;
        }
        if (entry.resource?.scheme === Schemas.file) {
            return entry.resource.fsPath;
        }
        return entry.resource?.path;
    }
}
export const quickPickItemScorerAccessor = new QuickPickItemScorerAccessor();
//#endregion
export const IQuickInputService = createDecorator('quickInputService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3F1aWNraW5wdXQvY29tbW9uL3F1aWNrSW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBTTdFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQTREekQsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFhLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUE7QUF1SG5FLE1BQU0sQ0FBTixJQUFZLG9CQWVYO0FBZkQsV0FBWSxvQkFBb0I7SUFDL0I7O09BRUc7SUFDSCwrREFBUSxDQUFBO0lBRVI7O09BRUc7SUFDSCxxRUFBTyxDQUFBO0lBRVA7O09BRUc7SUFDSCxpRUFBSyxDQUFBO0FBQ04sQ0FBQyxFQWZXLG9CQUFvQixLQUFwQixvQkFBb0IsUUFlL0I7QUFNRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQixjQUlqQjtBQUpELFdBQWtCLGNBQWM7SUFDL0IseUNBQXVCLENBQUE7SUFDdkIsdUNBQXFCLENBQUE7SUFDckIsNkNBQTJCLENBQUE7QUFDNUIsQ0FBQyxFQUppQixjQUFjLEtBQWQsY0FBYyxRQUkvQjtBQXVJRDs7O0dBR0c7QUFDSCxNQUFNLENBQU4sSUFBWSxjQWlCWDtBQWpCRCxXQUFZLGNBQWM7SUFDekI7O09BRUc7SUFDSCxtREFBSSxDQUFBO0lBQ0o7O09BRUc7SUFDSCxxREFBSyxDQUFBO0lBQ0w7O09BRUc7SUFDSCx1REFBTSxDQUFBO0lBQ047O09BRUc7SUFDSCxtREFBSSxDQUFBO0FBQ0wsQ0FBQyxFQWpCVyxjQUFjLEtBQWQsY0FBYyxRQWlCekI7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLGNBcUNYO0FBckNELFdBQVksY0FBYztJQUN6Qjs7T0FFRztJQUNILHFEQUFTLENBQUE7SUFDVDs7T0FFRztJQUNILHVEQUFNLENBQUE7SUFDTjs7T0FFRztJQUNILG1EQUFJLENBQUE7SUFDSjs7T0FFRztJQUNILG1EQUFJLENBQUE7SUFDSjs7T0FFRztJQUNILDJEQUFRLENBQUE7SUFDUjs7T0FFRztJQUNILDJEQUFRLENBQUE7SUFDUjs7T0FFRztJQUNILG1FQUFZLENBQUE7SUFDWjs7T0FFRztJQUNILHFFQUFhLENBQUE7SUFDYjs7T0FFRztJQUNILDZFQUFpQixDQUFBO0FBQ2xCLENBQUMsRUFyQ1csY0FBYyxLQUFkLGNBQWMsUUFxQ3pCO0FBNFNELE1BQU0sQ0FBTixJQUFZLHdCQVVYO0FBVkQsV0FBWSx3QkFBd0I7SUFDbkM7O09BRUc7SUFDSCx5RUFBUyxDQUFBO0lBRVQ7O09BRUc7SUFDSCwyRUFBVSxDQUFBO0FBQ1gsQ0FBQyxFQVZXLHdCQUF3QixLQUF4Qix3QkFBd0IsUUFVbkM7QUErRUQsTUFBTSxPQUFPLDJCQUEyQjtJQUN2QyxZQUFvQixPQUEyRDtRQUEzRCxZQUFPLEdBQVAsT0FBTyxDQUFvRDtJQUFHLENBQUM7SUFFbkYsWUFBWSxDQUFDLEtBQWlDO1FBQzdDLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQTtJQUNuQixDQUFDO0lBRUQsa0JBQWtCLENBQUMsS0FBaUM7UUFDbkQsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxDQUFDO1lBQ25DLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQyxXQUFXLENBQUE7SUFDekIsQ0FBQztJQUVELFdBQVcsQ0FBQyxLQUFpQztRQUM1QyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLENBQUM7WUFDNUIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxNQUFNLEtBQUssT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzdDLE9BQU8sS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUE7UUFDN0IsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUE7SUFDNUIsQ0FBQztDQUNEO0FBRUQsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSwyQkFBMkIsRUFBRSxDQUFBO0FBRTVFLFlBQVk7QUFFWixNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQXFCLG1CQUFtQixDQUFDLENBQUEifQ==
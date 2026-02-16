/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from '../../../../platform/registry/common/platform.js';
export function registerTerminalContribution(id, ctor, canRunInDetachedTerminals = false) {
    // eslint-disable-next-line local/code-no-dangerous-type-assertions
    TerminalContributionRegistry.INSTANCE.registerTerminalContribution({
        id,
        ctor,
        canRunInDetachedTerminals,
    });
}
/**
 * The registry of terminal contributions.
 *
 * **WARNING**: This is internal and should only be used by core terminal code that activates the
 * contributions.
 */
export var TerminalExtensionsRegistry;
(function (TerminalExtensionsRegistry) {
    function getTerminalContributions() {
        return TerminalContributionRegistry.INSTANCE.getTerminalContributions();
    }
    TerminalExtensionsRegistry.getTerminalContributions = getTerminalContributions;
})(TerminalExtensionsRegistry || (TerminalExtensionsRegistry = {}));
class TerminalContributionRegistry {
    static { this.INSTANCE = new TerminalContributionRegistry(); }
    constructor() {
        this._terminalContributions = [];
    }
    registerTerminalContribution(description) {
        this._terminalContributions.push(description);
    }
    getTerminalContributions() {
        return this._terminalContributions.slice(0);
    }
}
var Extensions;
(function (Extensions) {
    Extensions["TerminalContributions"] = "terminal.contributions";
})(Extensions || (Extensions = {}));
Registry.add("terminal.contributions" /* Extensions.TerminalContributions */, TerminalContributionRegistry.INSTANCE);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFeHRlbnNpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsRXh0ZW5zaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUEyRDNFLE1BQU0sVUFBVSw0QkFBNEIsQ0FDM0MsRUFBVSxFQUNWLElBQXNFLEVBQ3RFLDRCQUFxQyxLQUFLO0lBRTFDLG1FQUFtRTtJQUNuRSw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLENBQUM7UUFDbEUsRUFBRTtRQUNGLElBQUk7UUFDSix5QkFBeUI7S0FDVyxDQUFDLENBQUE7QUFDdkMsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxLQUFXLDBCQUEwQixDQUkxQztBQUpELFdBQWlCLDBCQUEwQjtJQUMxQyxTQUFnQix3QkFBd0I7UUFDdkMsT0FBTyw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTtJQUN4RSxDQUFDO0lBRmUsbURBQXdCLDJCQUV2QyxDQUFBO0FBQ0YsQ0FBQyxFQUpnQiwwQkFBMEIsS0FBMUIsMEJBQTBCLFFBSTFDO0FBRUQsTUFBTSw0QkFBNEI7YUFDVixhQUFRLEdBQUcsSUFBSSw0QkFBNEIsRUFBRSxBQUFyQyxDQUFxQztJQUlwRTtRQUZpQiwyQkFBc0IsR0FBdUMsRUFBRSxDQUFBO0lBRWpFLENBQUM7SUFFVCw0QkFBNEIsQ0FBQyxXQUE2QztRQUNoRixJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFTSx3QkFBd0I7UUFDOUIsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzVDLENBQUM7O0FBR0YsSUFBVyxVQUVWO0FBRkQsV0FBVyxVQUFVO0lBQ3BCLDhEQUFnRCxDQUFBO0FBQ2pELENBQUMsRUFGVSxVQUFVLEtBQVYsVUFBVSxRQUVwQjtBQUVELFFBQVEsQ0FBQyxHQUFHLGtFQUFtQyw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsQ0FBQSJ9
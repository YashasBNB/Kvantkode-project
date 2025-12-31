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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFeHRlbnNpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbEV4dGVuc2lvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBMkQzRSxNQUFNLFVBQVUsNEJBQTRCLENBQzNDLEVBQVUsRUFDVixJQUFzRSxFQUN0RSw0QkFBcUMsS0FBSztJQUUxQyxtRUFBbUU7SUFDbkUsNEJBQTRCLENBQUMsUUFBUSxDQUFDLDRCQUE0QixDQUFDO1FBQ2xFLEVBQUU7UUFDRixJQUFJO1FBQ0oseUJBQXlCO0tBQ1csQ0FBQyxDQUFBO0FBQ3ZDLENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILE1BQU0sS0FBVywwQkFBMEIsQ0FJMUM7QUFKRCxXQUFpQiwwQkFBMEI7SUFDMUMsU0FBZ0Isd0JBQXdCO1FBQ3ZDLE9BQU8sNEJBQTRCLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLENBQUE7SUFDeEUsQ0FBQztJQUZlLG1EQUF3QiwyQkFFdkMsQ0FBQTtBQUNGLENBQUMsRUFKZ0IsMEJBQTBCLEtBQTFCLDBCQUEwQixRQUkxQztBQUVELE1BQU0sNEJBQTRCO2FBQ1YsYUFBUSxHQUFHLElBQUksNEJBQTRCLEVBQUUsQUFBckMsQ0FBcUM7SUFJcEU7UUFGaUIsMkJBQXNCLEdBQXVDLEVBQUUsQ0FBQTtJQUVqRSxDQUFDO0lBRVQsNEJBQTRCLENBQUMsV0FBNkM7UUFDaEYsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBRU0sd0JBQXdCO1FBQzlCLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM1QyxDQUFDOztBQUdGLElBQVcsVUFFVjtBQUZELFdBQVcsVUFBVTtJQUNwQiw4REFBZ0QsQ0FBQTtBQUNqRCxDQUFDLEVBRlUsVUFBVSxLQUFWLFVBQVUsUUFFcEI7QUFFRCxRQUFRLENBQUMsR0FBRyxrRUFBbUMsNEJBQTRCLENBQUMsUUFBUSxDQUFDLENBQUEifQ==
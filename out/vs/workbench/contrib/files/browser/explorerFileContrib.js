/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
export var ExplorerExtensions;
(function (ExplorerExtensions) {
    ExplorerExtensions["FileContributionRegistry"] = "workbench.registry.explorer.fileContributions";
})(ExplorerExtensions || (ExplorerExtensions = {}));
class ExplorerFileContributionRegistry {
    constructor() {
        this._onDidRegisterDescriptor = new Emitter();
        this.onDidRegisterDescriptor = this._onDidRegisterDescriptor.event;
        this.descriptors = [];
    }
    /** @inheritdoc */
    register(descriptor) {
        this.descriptors.push(descriptor);
        this._onDidRegisterDescriptor.fire(descriptor);
    }
    /**
     * Creates a new instance of all registered contributions.
     */
    create(insta, container, store) {
        return this.descriptors.map((d) => {
            const i = d.create(insta, container);
            store.add(i);
            return i;
        });
    }
}
export const explorerFileContribRegistry = new ExplorerFileContributionRegistry();
Registry.add("workbench.registry.explorer.fileContributions" /* ExplorerExtensions.FileContributionRegistry */, explorerFileContribRegistry);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJGaWxlQ29udHJpYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2Jyb3dzZXIvZXhwbG9yZXJGaWxlQ29udHJpYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFJMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRTNFLE1BQU0sQ0FBTixJQUFrQixrQkFFakI7QUFGRCxXQUFrQixrQkFBa0I7SUFDbkMsZ0dBQTBFLENBQUE7QUFDM0UsQ0FBQyxFQUZpQixrQkFBa0IsS0FBbEIsa0JBQWtCLFFBRW5DO0FBeUJELE1BQU0sZ0NBQWdDO0lBQXRDO1FBQ2tCLDZCQUF3QixHQUFHLElBQUksT0FBTyxFQUF1QyxDQUFBO1FBQzlFLDRCQUF1QixHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUE7UUFFNUQsZ0JBQVcsR0FBMEMsRUFBRSxDQUFBO0lBc0J6RSxDQUFDO0lBcEJBLGtCQUFrQjtJQUNYLFFBQVEsQ0FBQyxVQUErQztRQUM5RCxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNqQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFFRDs7T0FFRztJQUNJLE1BQU0sQ0FDWixLQUE0QixFQUM1QixTQUFzQixFQUN0QixLQUFzQjtRQUV0QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDakMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDcEMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNaLE9BQU8sQ0FBQyxDQUFBO1FBQ1QsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLGdDQUFnQyxFQUFFLENBQUE7QUFDakYsUUFBUSxDQUFDLEdBQUcsb0dBQThDLDJCQUEyQixDQUFDLENBQUEifQ==
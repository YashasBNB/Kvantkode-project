/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Lazy } from '../../../common/lazy.js';
const nullHoverDelegateFactory = () => ({
    get delay() {
        return -1;
    },
    dispose: () => { },
    showHover: () => {
        return undefined;
    },
});
let hoverDelegateFactory = nullHoverDelegateFactory;
const defaultHoverDelegateMouse = new Lazy(() => hoverDelegateFactory('mouse', false));
const defaultHoverDelegateElement = new Lazy(() => hoverDelegateFactory('element', false));
// TODO: Remove when getDefaultHoverDelegate is no longer used
export function setHoverDelegateFactory(hoverDelegateProvider) {
    hoverDelegateFactory = hoverDelegateProvider;
}
// TODO: Refine type for use in new IHoverService interface
export function getDefaultHoverDelegate(placement) {
    if (placement === 'element') {
        return defaultHoverDelegateElement.value;
    }
    return defaultHoverDelegateMouse.value;
}
// TODO: Create equivalent in IHoverService
export function createInstantHoverDelegate() {
    // Creates a hover delegate with instant hover enabled.
    // This hover belongs to the consumer and requires the them to dispose it.
    // Instant hover only makes sense for 'element' placement.
    return hoverDelegateFactory('element', true);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJEZWxlZ2F0ZUZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvaG92ZXIvaG92ZXJEZWxlZ2F0ZUZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRTlDLE1BQU0sd0JBQXdCLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUN2QyxJQUFJLEtBQUs7UUFDUixPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQ1YsQ0FBQztJQUNELE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDO0lBQ2pCLFNBQVMsRUFBRSxHQUFHLEVBQUU7UUFDZixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsSUFBSSxvQkFBb0IsR0FHSSx3QkFBd0IsQ0FBQTtBQUNwRCxNQUFNLHlCQUF5QixHQUFHLElBQUksSUFBSSxDQUFpQixHQUFHLEVBQUUsQ0FDL0Qsb0JBQW9CLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUNwQyxDQUFBO0FBQ0QsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLElBQUksQ0FBaUIsR0FBRyxFQUFFLENBQ2pFLG9CQUFvQixDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FDdEMsQ0FBQTtBQUVELDhEQUE4RDtBQUM5RCxNQUFNLFVBQVUsdUJBQXVCLENBQ3RDLHFCQUd5QjtJQUV6QixvQkFBb0IsR0FBRyxxQkFBcUIsQ0FBQTtBQUM3QyxDQUFDO0FBRUQsMkRBQTJEO0FBQzNELE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxTQUE4QjtJQUNyRSxJQUFJLFNBQVMsS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUM3QixPQUFPLDJCQUEyQixDQUFDLEtBQUssQ0FBQTtJQUN6QyxDQUFDO0lBQ0QsT0FBTyx5QkFBeUIsQ0FBQyxLQUFLLENBQUE7QUFDdkMsQ0FBQztBQUVELDJDQUEyQztBQUMzQyxNQUFNLFVBQVUsMEJBQTBCO0lBQ3pDLHVEQUF1RDtJQUN2RCwwRUFBMEU7SUFDMUUsMERBQTBEO0lBQzFELE9BQU8sb0JBQW9CLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO0FBQzdDLENBQUMifQ==
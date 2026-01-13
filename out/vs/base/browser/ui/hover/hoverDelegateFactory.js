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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJEZWxlZ2F0ZUZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9ob3Zlci9ob3ZlckRlbGVnYXRlRmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFOUMsTUFBTSx3QkFBd0IsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLElBQUksS0FBSztRQUNSLE9BQU8sQ0FBQyxDQUFDLENBQUE7SUFDVixDQUFDO0lBQ0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUM7SUFDakIsU0FBUyxFQUFFLEdBQUcsRUFBRTtRQUNmLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7Q0FDRCxDQUFDLENBQUE7QUFFRixJQUFJLG9CQUFvQixHQUdJLHdCQUF3QixDQUFBO0FBQ3BELE1BQU0seUJBQXlCLEdBQUcsSUFBSSxJQUFJLENBQWlCLEdBQUcsRUFBRSxDQUMvRCxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQ3BDLENBQUE7QUFDRCxNQUFNLDJCQUEyQixHQUFHLElBQUksSUFBSSxDQUFpQixHQUFHLEVBQUUsQ0FDakUsb0JBQW9CLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUN0QyxDQUFBO0FBRUQsOERBQThEO0FBQzlELE1BQU0sVUFBVSx1QkFBdUIsQ0FDdEMscUJBR3lCO0lBRXpCLG9CQUFvQixHQUFHLHFCQUFxQixDQUFBO0FBQzdDLENBQUM7QUFFRCwyREFBMkQ7QUFDM0QsTUFBTSxVQUFVLHVCQUF1QixDQUFDLFNBQThCO0lBQ3JFLElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQzdCLE9BQU8sMkJBQTJCLENBQUMsS0FBSyxDQUFBO0lBQ3pDLENBQUM7SUFDRCxPQUFPLHlCQUF5QixDQUFDLEtBQUssQ0FBQTtBQUN2QyxDQUFDO0FBRUQsMkNBQTJDO0FBQzNDLE1BQU0sVUFBVSwwQkFBMEI7SUFDekMsdURBQXVEO0lBQ3ZELDBFQUEwRTtJQUMxRSwwREFBMEQ7SUFDMUQsT0FBTyxvQkFBb0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7QUFDN0MsQ0FBQyJ9
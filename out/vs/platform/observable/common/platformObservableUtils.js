/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { autorunOpts, observableFromEventOpts, } from '../../../base/common/observable.js';
/** Creates an observable update when a configuration key updates. */
export function observableConfigValue(key, defaultValue, configurationService) {
    return observableFromEventOpts({ debugName: () => `Configuration Key "${key}"` }, (handleChange) => configurationService.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(key)) {
            handleChange(e);
        }
    }), () => configurationService.getValue(key) ?? defaultValue);
}
/** Update the configuration key with a value derived from observables. */
export function bindContextKey(key, service, computeValue) {
    const boundKey = key.bindTo(service);
    return autorunOpts({ debugName: () => `Set Context Key "${key.key}"` }, (reader) => {
        boundKey.set(computeValue(reader));
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhdGZvcm1PYnNlcnZhYmxlVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL29ic2VydmFibGUvY29tbW9uL3BsYXRmb3JtT2JzZXJ2YWJsZVV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFDTixXQUFXLEVBR1gsdUJBQXVCLEdBQ3ZCLE1BQU0sb0NBQW9DLENBQUE7QUFRM0MscUVBQXFFO0FBQ3JFLE1BQU0sVUFBVSxxQkFBcUIsQ0FDcEMsR0FBVyxFQUNYLFlBQWUsRUFDZixvQkFBMkM7SUFFM0MsT0FBTyx1QkFBdUIsQ0FDN0IsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsc0JBQXNCLEdBQUcsR0FBRyxFQUFFLEVBQ2pELENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FDaEIsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtRQUNuRCxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2pDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNoQixDQUFDO0lBQ0YsQ0FBQyxDQUFDLEVBQ0gsR0FBRyxFQUFFLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFJLEdBQUcsQ0FBQyxJQUFJLFlBQVksQ0FDM0QsQ0FBQTtBQUNGLENBQUM7QUFFRCwwRUFBMEU7QUFDMUUsTUFBTSxVQUFVLGNBQWMsQ0FDN0IsR0FBcUIsRUFDckIsT0FBMkIsRUFDM0IsWUFBb0M7SUFFcEMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNwQyxPQUFPLFdBQVcsQ0FBQyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxvQkFBb0IsR0FBRyxDQUFDLEdBQUcsR0FBRyxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtRQUNsRixRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQ25DLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyJ9
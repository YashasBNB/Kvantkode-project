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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhdGZvcm1PYnNlcnZhYmxlVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9vYnNlcnZhYmxlL2NvbW1vbi9wbGF0Zm9ybU9ic2VydmFibGVVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQ04sV0FBVyxFQUdYLHVCQUF1QixHQUN2QixNQUFNLG9DQUFvQyxDQUFBO0FBUTNDLHFFQUFxRTtBQUNyRSxNQUFNLFVBQVUscUJBQXFCLENBQ3BDLEdBQVcsRUFDWCxZQUFlLEVBQ2Ysb0JBQTJDO0lBRTNDLE9BQU8sdUJBQXVCLENBQzdCLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLHNCQUFzQixHQUFHLEdBQUcsRUFBRSxFQUNqRCxDQUFDLFlBQVksRUFBRSxFQUFFLENBQ2hCLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7UUFDbkQsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEIsQ0FBQztJQUNGLENBQUMsQ0FBQyxFQUNILEdBQUcsRUFBRSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBSSxHQUFHLENBQUMsSUFBSSxZQUFZLENBQzNELENBQUE7QUFDRixDQUFDO0FBRUQsMEVBQTBFO0FBQzFFLE1BQU0sVUFBVSxjQUFjLENBQzdCLEdBQXFCLEVBQ3JCLE9BQTJCLEVBQzNCLFlBQW9DO0lBRXBDLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDcEMsT0FBTyxXQUFXLENBQUMsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsb0JBQW9CLEdBQUcsQ0FBQyxHQUFHLEdBQUcsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFDbEYsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUNuQyxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMifQ==
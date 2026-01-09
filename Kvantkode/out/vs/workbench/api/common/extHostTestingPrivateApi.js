/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { InvalidTestItemError, } from '../../contrib/testing/common/testItemCollection.js';
const eventPrivateApis = new WeakMap();
export const createPrivateApiFor = (impl, controllerId) => {
    const api = { controllerId };
    eventPrivateApis.set(impl, api);
    return api;
};
/**
 * Gets the private API for a test item implementation. This implementation
 * is a managed object, but we keep a weakmap to avoid exposing any of the
 * internals to extensions.
 */
export const getPrivateApiFor = (impl) => {
    const api = eventPrivateApis.get(impl);
    if (!api) {
        throw new InvalidTestItemError(impl?.id || '<unknown>');
    }
    return api;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlc3RpbmdQcml2YXRlQXBpLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0VGVzdGluZ1ByaXZhdGVBcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUVOLG9CQUFvQixHQUNwQixNQUFNLG9EQUFvRCxDQUFBO0FBUzNELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxPQUFPLEVBQXdDLENBQUE7QUFFNUUsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxJQUFxQixFQUFFLFlBQW9CLEVBQUUsRUFBRTtJQUNsRixNQUFNLEdBQUcsR0FBd0IsRUFBRSxZQUFZLEVBQUUsQ0FBQTtJQUNqRCxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQy9CLE9BQU8sR0FBRyxDQUFBO0FBQ1gsQ0FBQyxDQUFBO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLENBQUMsSUFBcUIsRUFBRSxFQUFFO0lBQ3pELE1BQU0sR0FBRyxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDVixNQUFNLElBQUksb0JBQW9CLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxXQUFXLENBQUMsQ0FBQTtJQUN4RCxDQUFDO0lBRUQsT0FBTyxHQUFHLENBQUE7QUFDWCxDQUFDLENBQUEifQ==
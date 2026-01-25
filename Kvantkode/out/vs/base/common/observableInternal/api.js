/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ObservableValue } from './base.js';
import { DebugNameData } from './debugName.js';
import { strictEquals } from './commonFacade/deps.js';
import { LazyObservableValue } from './lazyObservableValue.js';
export function observableValueOpts(options, initialValue) {
    if (options.lazy) {
        return new LazyObservableValue(new DebugNameData(options.owner, options.debugName, undefined), initialValue, options.equalsFn ?? strictEquals);
    }
    return new ObservableValue(new DebugNameData(options.owner, options.debugName, undefined), initialValue, options.equalsFn ?? strictEquals);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvYXBpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBdUIsZUFBZSxFQUFFLE1BQU0sV0FBVyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxhQUFhLEVBQWtCLE1BQU0sZ0JBQWdCLENBQUE7QUFDOUQsT0FBTyxFQUFvQixZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUU5RCxNQUFNLFVBQVUsbUJBQW1CLENBQ2xDLE9BR0MsRUFDRCxZQUFlO0lBRWYsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbEIsT0FBTyxJQUFJLG1CQUFtQixDQUM3QixJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQzlELFlBQVksRUFDWixPQUFPLENBQUMsUUFBUSxJQUFJLFlBQVksQ0FDaEMsQ0FBQTtJQUNGLENBQUM7SUFDRCxPQUFPLElBQUksZUFBZSxDQUN6QixJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQzlELFlBQVksRUFDWixPQUFPLENBQUMsUUFBUSxJQUFJLFlBQVksQ0FDaEMsQ0FBQTtBQUNGLENBQUMifQ==
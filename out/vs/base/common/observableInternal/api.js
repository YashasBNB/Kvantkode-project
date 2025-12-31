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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL2FwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQXVCLGVBQWUsRUFBRSxNQUFNLFdBQVcsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsYUFBYSxFQUFrQixNQUFNLGdCQUFnQixDQUFBO0FBQzlELE9BQU8sRUFBb0IsWUFBWSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFOUQsTUFBTSxVQUFVLG1CQUFtQixDQUNsQyxPQUdDLEVBQ0QsWUFBZTtJQUVmLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2xCLE9BQU8sSUFBSSxtQkFBbUIsQ0FDN0IsSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUM5RCxZQUFZLEVBQ1osT0FBTyxDQUFDLFFBQVEsSUFBSSxZQUFZLENBQ2hDLENBQUE7SUFDRixDQUFDO0lBQ0QsT0FBTyxJQUFJLGVBQWUsQ0FDekIsSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUM5RCxZQUFZLEVBQ1osT0FBTyxDQUFDLFFBQVEsSUFBSSxZQUFZLENBQ2hDLENBQUE7QUFDRixDQUFDIn0=
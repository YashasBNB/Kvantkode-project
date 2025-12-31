/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { onUnexpectedError, transformErrorFromSerialization, } from '../../../base/common/errors.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { MainContext } from '../common/extHost.protocol.js';
let MainThreadErrors = class MainThreadErrors {
    dispose() {
        //
    }
    $onUnexpectedError(err) {
        if (err && err.$isError) {
            err = transformErrorFromSerialization(err);
        }
        onUnexpectedError(err);
    }
};
MainThreadErrors = __decorate([
    extHostNamedCustomer(MainContext.MainThreadErrors)
], MainThreadErrors);
export { MainThreadErrors };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEVycm9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkRXJyb3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFFTixpQkFBaUIsRUFDakIsK0JBQStCLEdBQy9CLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDM0YsT0FBTyxFQUFFLFdBQVcsRUFBeUIsTUFBTSwrQkFBK0IsQ0FBQTtBQUczRSxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFnQjtJQUM1QixPQUFPO1FBQ04sRUFBRTtJQUNILENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxHQUEwQjtRQUM1QyxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDekIsR0FBRyxHQUFHLCtCQUErQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzNDLENBQUM7UUFDRCxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUN2QixDQUFDO0NBQ0QsQ0FBQTtBQVhZLGdCQUFnQjtJQUQ1QixvQkFBb0IsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUM7R0FDdEMsZ0JBQWdCLENBVzVCIn0=
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function extHostNamedCustomer(id) {
    return function (ctor) {
        ExtHostCustomersRegistryImpl.INSTANCE.registerNamedCustomer(id, ctor);
    };
}
export function extHostCustomer(ctor) {
    ExtHostCustomersRegistryImpl.INSTANCE.registerCustomer(ctor);
}
export var ExtHostCustomersRegistry;
(function (ExtHostCustomersRegistry) {
    function getNamedCustomers() {
        return ExtHostCustomersRegistryImpl.INSTANCE.getNamedCustomers();
    }
    ExtHostCustomersRegistry.getNamedCustomers = getNamedCustomers;
    function getCustomers() {
        return ExtHostCustomersRegistryImpl.INSTANCE.getCustomers();
    }
    ExtHostCustomersRegistry.getCustomers = getCustomers;
})(ExtHostCustomersRegistry || (ExtHostCustomersRegistry = {}));
class ExtHostCustomersRegistryImpl {
    static { this.INSTANCE = new ExtHostCustomersRegistryImpl(); }
    constructor() {
        this._namedCustomers = [];
        this._customers = [];
    }
    registerNamedCustomer(id, ctor) {
        const entry = [id, ctor];
        this._namedCustomers.push(entry);
    }
    getNamedCustomers() {
        return this._namedCustomers;
    }
    registerCustomer(ctor) {
        this._customers.push(ctor);
    }
    getCustomers() {
        return this._customers;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEN1c3RvbWVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2NvbW1vbi9leHRIb3N0Q3VzdG9tZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBaUNoRyxNQUFNLFVBQVUsb0JBQW9CLENBQXdCLEVBQXNCO0lBQ2pGLE9BQU8sVUFBNkMsSUFFbkQ7UUFDQSw0QkFBNEIsQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsRUFBRSxFQUFFLElBQStCLENBQUMsQ0FBQTtJQUNqRyxDQUFDLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLGVBQWUsQ0FBMkQsSUFFekY7SUFDQSw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBK0IsQ0FBQyxDQUFBO0FBQ3hGLENBQUM7QUFFRCxNQUFNLEtBQVcsd0JBQXdCLENBUXhDO0FBUkQsV0FBaUIsd0JBQXdCO0lBQ3hDLFNBQWdCLGlCQUFpQjtRQUNoQyxPQUFPLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ2pFLENBQUM7SUFGZSwwQ0FBaUIsb0JBRWhDLENBQUE7SUFFRCxTQUFnQixZQUFZO1FBQzNCLE9BQU8sNEJBQTRCLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFBO0lBQzVELENBQUM7SUFGZSxxQ0FBWSxlQUUzQixDQUFBO0FBQ0YsQ0FBQyxFQVJnQix3QkFBd0IsS0FBeEIsd0JBQXdCLFFBUXhDO0FBRUQsTUFBTSw0QkFBNEI7YUFDVixhQUFRLEdBQUcsSUFBSSw0QkFBNEIsRUFBRSxDQUFBO0lBS3BFO1FBQ0MsSUFBSSxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUE7UUFDekIsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUE7SUFDckIsQ0FBQztJQUVNLHFCQUFxQixDQUMzQixFQUFzQixFQUN0QixJQUE2QjtRQUU3QixNQUFNLEtBQUssR0FBNkIsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDbEQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUNNLGlCQUFpQjtRQUN2QixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUE7SUFDNUIsQ0FBQztJQUVNLGdCQUFnQixDQUF3QixJQUE2QjtRQUMzRSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMzQixDQUFDO0lBQ00sWUFBWTtRQUNsQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUE7SUFDdkIsQ0FBQyJ9
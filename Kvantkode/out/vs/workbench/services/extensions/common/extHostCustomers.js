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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEN1c3RvbWVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL2V4dEhvc3RDdXN0b21lcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFpQ2hHLE1BQU0sVUFBVSxvQkFBb0IsQ0FBd0IsRUFBc0I7SUFDakYsT0FBTyxVQUE2QyxJQUVuRDtRQUNBLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLEVBQUUsSUFBK0IsQ0FBQyxDQUFBO0lBQ2pHLENBQUMsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsZUFBZSxDQUEyRCxJQUV6RjtJQUNBLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUErQixDQUFDLENBQUE7QUFDeEYsQ0FBQztBQUVELE1BQU0sS0FBVyx3QkFBd0IsQ0FReEM7QUFSRCxXQUFpQix3QkFBd0I7SUFDeEMsU0FBZ0IsaUJBQWlCO1FBQ2hDLE9BQU8sNEJBQTRCLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDakUsQ0FBQztJQUZlLDBDQUFpQixvQkFFaEMsQ0FBQTtJQUVELFNBQWdCLFlBQVk7UUFDM0IsT0FBTyw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLENBQUE7SUFDNUQsQ0FBQztJQUZlLHFDQUFZLGVBRTNCLENBQUE7QUFDRixDQUFDLEVBUmdCLHdCQUF3QixLQUF4Qix3QkFBd0IsUUFReEM7QUFFRCxNQUFNLDRCQUE0QjthQUNWLGFBQVEsR0FBRyxJQUFJLDRCQUE0QixFQUFFLENBQUE7SUFLcEU7UUFDQyxJQUFJLENBQUMsZUFBZSxHQUFHLEVBQUUsQ0FBQTtRQUN6QixJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQTtJQUNyQixDQUFDO0lBRU0scUJBQXFCLENBQzNCLEVBQXNCLEVBQ3RCLElBQTZCO1FBRTdCLE1BQU0sS0FBSyxHQUE2QixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNsRCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBQ00saUJBQWlCO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQTtJQUM1QixDQUFDO0lBRU0sZ0JBQWdCLENBQXdCLElBQTZCO1FBQzNFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzNCLENBQUM7SUFDTSxZQUFZO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQTtJQUN2QixDQUFDIn0=
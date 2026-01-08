/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { stub } from 'sinon';
export function mock() {
    return function () { };
}
// Creates an object object that returns sinon mocks for every property. Optionally
// takes base properties.
export const mockObject = () => (properties) => {
    return new Proxy({ ...properties }, {
        get(target, key) {
            if (!target.hasOwnProperty(key)) {
                target[key] = stub();
            }
            return target[key];
        },
        set(target, key, value) {
            target[key] = value;
            return true;
        },
    });
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9jay5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9tb2NrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBYSxJQUFJLEVBQUUsTUFBTSxPQUFPLENBQUE7QUFNdkMsTUFBTSxVQUFVLElBQUk7SUFDbkIsT0FBTyxjQUFhLENBQVEsQ0FBQTtBQUM3QixDQUFDO0FBTUQsbUZBQW1GO0FBQ25GLHlCQUF5QjtBQUN6QixNQUFNLENBQUMsTUFBTSxVQUFVLEdBQ3RCLEdBQXFCLEVBQUUsQ0FDdkIsQ0FBNkIsVUFBZSxFQUEyQixFQUFFO0lBQ3hFLE9BQU8sSUFBSSxLQUFLLENBQUMsRUFBRSxHQUFHLFVBQVUsRUFBUyxFQUFFO1FBQzFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRztZQUNkLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQTtZQUNyQixDQUFDO1lBRUQsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDbkIsQ0FBQztRQUNELEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEtBQUs7WUFDckIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQTtZQUNuQixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7S0FDRCxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUEifQ==
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertOneOf } from '../../../../../base/common/types.js';
/**
 * Mocks an `TObject` with the provided `overrides`.
 *
 * If you need to mock an `Service`, please use {@link mockService}
 * instead which provides better type safety guarantees for the case.
 *
 * @throws Reading non-overidden property or function
 * 		   on `TObject` throws an error.
 */
export function mockObject(overrides) {
    // ensure that the overrides object cannot be modified afterward
    overrides = Object.freeze(overrides);
    const keys = Object.keys(overrides);
    const service = new Proxy({}, {
        get: (_target, key) => {
            // sanity check for the provided `key`
            assertOneOf(key, keys, `The '${key}' is not mocked.`);
            return overrides[key];
        },
    });
    // note! it's ok to `as TObject` here, because of
    // 		 the runtime checks in the `Proxy` getter
    return service;
}
/**
 * Mocks provided service with the provided `overrides`.
 * Same as more generic {@link mockObject} utility, but with
 * the service constraint on the `TService` type.
 *
 * @throws Reading non-overidden property or function
 * 		   on `TService` throws an error.
 */
export function mockService(overrides) {
    return mockObject(overrides);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9jay5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Byb21wdHMvdGVzdC9jb21tb24vdXRpbHMvbW9jay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFakU7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFNLFVBQVUsVUFBVSxDQUF5QixTQUEyQjtJQUM3RSxnRUFBZ0U7SUFDaEUsU0FBUyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7SUFFcEMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQStCLENBQUE7SUFDakUsTUFBTSxPQUFPLEdBQUcsSUFBSSxLQUFLLENBQ3hCLEVBQUUsRUFDRjtRQUNDLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUE2QixFQUFFLEVBQUU7WUFDL0Msc0NBQXNDO1lBQ3RDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLFFBQVEsR0FBRyxrQkFBa0IsQ0FBQyxDQUFBO1lBRXJELE9BQU8sU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3RCLENBQUM7S0FDRCxDQUNELENBQUE7SUFFRCxpREFBaUQ7SUFDakQsOENBQThDO0lBQzlDLE9BQU8sT0FBc0MsQ0FBQTtBQUM5QyxDQUFDO0FBU0Q7Ozs7Ozs7R0FPRztBQUNILE1BQU0sVUFBVSxXQUFXLENBQStCLFNBQTRCO0lBQ3JGLE9BQU8sVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0FBQzdCLENBQUMifQ==
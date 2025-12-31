/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let productObj = {
    BUILD_INSERT_PRODUCT_CONFIGURATION: 'BUILD_INSERT_PRODUCT_CONFIGURATION',
}; // DO NOT MODIFY, PATCHED DURING BUILD
if (productObj['BUILD_INSERT_PRODUCT_CONFIGURATION']) {
    productObj = require('../product.json'); // Running out of sources
}
let pkgObj = { BUILD_INSERT_PACKAGE_CONFIGURATION: 'BUILD_INSERT_PACKAGE_CONFIGURATION' }; // DO NOT MODIFY, PATCHED DURING BUILD
if (pkgObj['BUILD_INSERT_PACKAGE_CONFIGURATION']) {
    pkgObj = require('../package.json'); // Running out of sources
}
export const product = productObj;
export const pkg = pkgObj;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLW1ldGEuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJib290c3RyYXAtbWV0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBRzNDLE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0FBRTlDLElBQUksVUFBVSxHQUFxRjtJQUNsRyxrQ0FBa0MsRUFBRSxvQ0FBb0M7Q0FDeEUsQ0FBQSxDQUFDLHNDQUFzQztBQUN4QyxJQUFJLFVBQVUsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUM7SUFDdEQsVUFBVSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBLENBQUMseUJBQXlCO0FBQ2xFLENBQUM7QUFFRCxJQUFJLE1BQU0sR0FBRyxFQUFFLGtDQUFrQyxFQUFFLG9DQUFvQyxFQUFFLENBQUEsQ0FBQyxzQ0FBc0M7QUFDaEksSUFBSSxNQUFNLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDO0lBQ2xELE1BQU0sR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQSxDQUFDLHlCQUF5QjtBQUM5RCxDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQTtBQUNqQyxNQUFNLENBQUMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFBIn0=
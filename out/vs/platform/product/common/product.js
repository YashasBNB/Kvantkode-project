/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { env } from '../../../base/common/process.js';
/**
 * @deprecated It is preferred that you use `IProductService` if you can. This
 * allows web embedders to override our defaults. But for things like `product.quality`,
 * the use is fine because that property is not overridable.
 */
let product;
// Native sandbox environment
const vscodeGlobal = globalThis.vscode;
if (typeof vscodeGlobal !== 'undefined' && typeof vscodeGlobal.context !== 'undefined') {
    const configuration = vscodeGlobal.context.configuration();
    if (configuration) {
        product = configuration.product;
    }
    else {
        throw new Error('Sandbox: unable to resolve product configuration from preload script.');
    }
}
// _VSCODE environment
else if (globalThis._VSCODE_PRODUCT_JSON && globalThis._VSCODE_PACKAGE_JSON) {
    // Obtain values from product.json and package.json-data
    product = globalThis._VSCODE_PRODUCT_JSON;
    // Running out of sources
    if (env['VSCODE_DEV']) {
        Object.assign(product, {
            nameShort: `${product.nameShort} Dev`,
            nameLong: `${product.nameLong} Dev`,
            dataFolderName: `${product.dataFolderName}-dev`,
            serverDataFolderName: product.serverDataFolderName
                ? `${product.serverDataFolderName}-dev`
                : undefined,
        });
    }
    // Version is added during built time, but we still
    // want to have it running out of sources so we
    // read it from package.json only when we need it.
    if (!product.version) {
        const pkg = globalThis._VSCODE_PACKAGE_JSON;
        Object.assign(product, {
            version: pkg.version,
        });
    }
}
// Web environment or unknown
else {
    // Built time configuration (do NOT modify)
    product = {
    /*BUILD->INSERT_PRODUCT_CONFIGURATION*/
    };
    // Running out of sources
    if (Object.keys(product).length === 0) {
        Object.assign(product, {
            version: '1.95.0-dev',
            nameShort: 'Code - OSS Dev',
            nameLong: 'Code - OSS Dev',
            applicationName: 'code-oss',
            dataFolderName: '.vscode-oss',
            urlProtocol: 'code-oss',
            reportIssueUrl: 'https://github.com/microsoft/vscode/issues/new',
            licenseName: 'MIT',
            licenseUrl: 'https://github.com/microsoft/vscode/blob/main/LICENSE.txt',
            serverLicenseUrl: 'https://github.com/microsoft/vscode/blob/main/LICENSE.txt',
        });
    }
}
export default product;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Byb2R1Y3QvY29tbW9uL3Byb2R1Y3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBSXJEOzs7O0dBSUc7QUFDSCxJQUFJLE9BQThCLENBQUE7QUFFbEMsNkJBQTZCO0FBQzdCLE1BQU0sWUFBWSxHQUFJLFVBQWtCLENBQUMsTUFBTSxDQUFBO0FBQy9DLElBQUksT0FBTyxZQUFZLEtBQUssV0FBVyxJQUFJLE9BQU8sWUFBWSxDQUFDLE9BQU8sS0FBSyxXQUFXLEVBQUUsQ0FBQztJQUN4RixNQUFNLGFBQWEsR0FBc0MsWUFBWSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQTtJQUM3RixJQUFJLGFBQWEsRUFBRSxDQUFDO1FBQ25CLE9BQU8sR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFBO0lBQ2hDLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxJQUFJLEtBQUssQ0FBQyx1RUFBdUUsQ0FBQyxDQUFBO0lBQ3pGLENBQUM7QUFDRixDQUFDO0FBQ0Qsc0JBQXNCO0tBQ2pCLElBQUksVUFBVSxDQUFDLG9CQUFvQixJQUFJLFVBQVUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzdFLHdEQUF3RDtJQUN4RCxPQUFPLEdBQUcsVUFBVSxDQUFDLG9CQUF3RCxDQUFBO0lBRTdFLHlCQUF5QjtJQUN6QixJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFO1lBQ3RCLFNBQVMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxTQUFTLE1BQU07WUFDckMsUUFBUSxFQUFFLEdBQUcsT0FBTyxDQUFDLFFBQVEsTUFBTTtZQUNuQyxjQUFjLEVBQUUsR0FBRyxPQUFPLENBQUMsY0FBYyxNQUFNO1lBQy9DLG9CQUFvQixFQUFFLE9BQU8sQ0FBQyxvQkFBb0I7Z0JBQ2pELENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsTUFBTTtnQkFDdkMsQ0FBQyxDQUFDLFNBQVM7U0FDWixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsbURBQW1EO0lBQ25ELCtDQUErQztJQUMvQyxrREFBa0Q7SUFDbEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN0QixNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsb0JBQTJDLENBQUE7UUFFbEUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUU7WUFDdEIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPO1NBQ3BCLENBQUMsQ0FBQTtJQUNILENBQUM7QUFDRixDQUFDO0FBRUQsNkJBQTZCO0tBQ3hCLENBQUM7SUFDTCwyQ0FBMkM7SUFDM0MsT0FBTyxHQUFHO0lBQ1QsdUNBQXVDO0tBQ2hDLENBQUE7SUFFUix5QkFBeUI7SUFDekIsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN2QyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRTtZQUN0QixPQUFPLEVBQUUsWUFBWTtZQUNyQixTQUFTLEVBQUUsZ0JBQWdCO1lBQzNCLFFBQVEsRUFBRSxnQkFBZ0I7WUFDMUIsZUFBZSxFQUFFLFVBQVU7WUFDM0IsY0FBYyxFQUFFLGFBQWE7WUFDN0IsV0FBVyxFQUFFLFVBQVU7WUFDdkIsY0FBYyxFQUFFLGdEQUFnRDtZQUNoRSxXQUFXLEVBQUUsS0FBSztZQUNsQixVQUFVLEVBQUUsMkRBQTJEO1lBQ3ZFLGdCQUFnQixFQUFFLDJEQUEyRDtTQUM3RSxDQUFDLENBQUE7SUFDSCxDQUFDO0FBQ0YsQ0FBQztBQUVELGVBQWUsT0FBTyxDQUFBIn0=
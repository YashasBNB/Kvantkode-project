/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
export const NullOpenerService = Object.freeze({
    _serviceBrand: undefined,
    registerOpener() {
        return Disposable.None;
    },
    registerValidator() {
        return Disposable.None;
    },
    registerExternalUriResolver() {
        return Disposable.None;
    },
    setDefaultExternalOpener() { },
    registerExternalOpener() {
        return Disposable.None;
    },
    async open() {
        return false;
    },
    async resolveExternalUri(uri) {
        return { resolved: uri, dispose() { } };
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVsbE9wZW5lclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL29wZW5lci90ZXN0L2NvbW1vbi9udWxsT3BlbmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFJakUsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBaUI7SUFDOUQsYUFBYSxFQUFFLFNBQVM7SUFDeEIsY0FBYztRQUNiLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQTtJQUN2QixDQUFDO0lBQ0QsaUJBQWlCO1FBQ2hCLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQTtJQUN2QixDQUFDO0lBQ0QsMkJBQTJCO1FBQzFCLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQTtJQUN2QixDQUFDO0lBQ0Qsd0JBQXdCLEtBQUksQ0FBQztJQUM3QixzQkFBc0I7UUFDckIsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFBO0lBQ3ZCLENBQUM7SUFDRCxLQUFLLENBQUMsSUFBSTtRQUNULE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxHQUFRO1FBQ2hDLE9BQU8sRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLE9BQU8sS0FBSSxDQUFDLEVBQUUsQ0FBQTtJQUN2QyxDQUFDO0NBQ0QsQ0FBQyxDQUFBIn0=
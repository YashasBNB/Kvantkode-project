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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVsbE9wZW5lclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9vcGVuZXIvdGVzdC9jb21tb24vbnVsbE9wZW5lclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBSWpFLE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQWlCO0lBQzlELGFBQWEsRUFBRSxTQUFTO0lBQ3hCLGNBQWM7UUFDYixPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUE7SUFDdkIsQ0FBQztJQUNELGlCQUFpQjtRQUNoQixPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUE7SUFDdkIsQ0FBQztJQUNELDJCQUEyQjtRQUMxQixPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUE7SUFDdkIsQ0FBQztJQUNELHdCQUF3QixLQUFJLENBQUM7SUFDN0Isc0JBQXNCO1FBQ3JCLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQTtJQUN2QixDQUFDO0lBQ0QsS0FBSyxDQUFDLElBQUk7UUFDVCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxLQUFLLENBQUMsa0JBQWtCLENBQUMsR0FBUTtRQUNoQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxPQUFPLEtBQUksQ0FBQyxFQUFFLENBQUE7SUFDdkMsQ0FBQztDQUNELENBQUMsQ0FBQSJ9
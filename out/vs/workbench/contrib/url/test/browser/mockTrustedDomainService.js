/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
import { isURLDomainTrusted } from '../../common/trustedDomains.js';
export class MockTrustedDomainService {
    constructor(_trustedDomains = []) {
        this._trustedDomains = _trustedDomains;
        this.onDidChangeTrustedDomains = Event.None;
    }
    isValid(resource) {
        return isURLDomainTrusted(resource, this._trustedDomains);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja1RydXN0ZWREb21haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdXJsL3Rlc3QvYnJvd3Nlci9tb2NrVHJ1c3RlZERvbWFpblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRzNELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRW5FLE1BQU0sT0FBTyx3QkFBd0I7SUFHcEMsWUFBNkIsa0JBQTRCLEVBQUU7UUFBOUIsb0JBQWUsR0FBZixlQUFlLENBQWU7UUFFM0QsOEJBQXlCLEdBQWdCLEtBQUssQ0FBQyxJQUFJLENBQUE7SUFGVyxDQUFDO0lBSS9ELE9BQU8sQ0FBQyxRQUFhO1FBQ3BCLE9BQU8sa0JBQWtCLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0NBQ0QifQ==
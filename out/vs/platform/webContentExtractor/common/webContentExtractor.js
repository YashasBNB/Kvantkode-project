/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IWebContentExtractorService = createDecorator('IWebContentExtractorService');
export const ISharedWebContentExtractorService = createDecorator('ISharedWebContentExtractorService');
/**
 * A service that extracts web content from a given URI.
 * This is a placeholder implementation that does not perform any actual extraction.
 * It's intended to be used on platforms where web content extraction is not supported such as in the browser.
 */
export class NullWebContentExtractorService {
    extract(_uri) {
        throw new Error('Not implemented');
    }
}
export class NullSharedWebContentExtractorService {
    readImage(_uri, _token) {
        throw new Error('Not implemented');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViQ29udGVudEV4dHJhY3Rvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dlYkNvbnRlbnRFeHRyYWN0b3IvY29tbW9uL3dlYkNvbnRlbnRFeHRyYWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRTdFLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLGVBQWUsQ0FDekQsNkJBQTZCLENBQzdCLENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSxpQ0FBaUMsR0FBRyxlQUFlLENBQy9ELG1DQUFtQyxDQUNuQyxDQUFBO0FBZUQ7Ozs7R0FJRztBQUNILE1BQU0sT0FBTyw4QkFBOEI7SUFHMUMsT0FBTyxDQUFDLElBQVc7UUFDbEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxvQ0FBb0M7SUFFaEQsU0FBUyxDQUFDLElBQVMsRUFBRSxNQUF5QjtRQUM3QyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztDQUNEIn0=
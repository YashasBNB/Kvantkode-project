/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { rtrim } from '../../../../base/common/strings.js';
export function normalizeGitHubUrl(url) {
    // If the url has a .git suffix, remove it
    if (url.endsWith('.git')) {
        url = url.substr(0, url.length - 4);
    }
    // Remove trailing slash
    url = rtrim(url, '/');
    if (url.endsWith('/new')) {
        url = rtrim(url, '/new');
    }
    if (url.endsWith('/issues')) {
        url = rtrim(url, '/issues');
    }
    return url;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVSZXBvcnRlclV0aWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lzc3VlL2NvbW1vbi9pc3N1ZVJlcG9ydGVyVXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFMUQsTUFBTSxVQUFVLGtCQUFrQixDQUFDLEdBQVc7SUFDN0MsMENBQTBDO0lBQzFDLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1FBQzFCLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCx3QkFBd0I7SUFDeEIsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFFckIsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7UUFDMUIsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDekIsQ0FBQztJQUVELElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1FBQzdCLEdBQUcsR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQzVCLENBQUM7SUFFRCxPQUFPLEdBQUcsQ0FBQTtBQUNYLENBQUMifQ==
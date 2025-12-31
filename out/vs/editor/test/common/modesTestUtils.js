/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LineTokens } from '../../common/tokens/lineTokens.js';
import { createScopedLineTokens } from '../../common/languages/supports.js';
import { LanguageIdCodec } from '../../common/services/languagesRegistry.js';
export function createFakeScopedLineTokens(rawTokens) {
    const tokens = new Uint32Array(rawTokens.length << 1);
    let line = '';
    for (let i = 0, len = rawTokens.length; i < len; i++) {
        const rawToken = rawTokens[i];
        const startOffset = line.length;
        const metadata = (rawToken.type << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */) >>> 0;
        tokens[i << 1] = startOffset;
        tokens[(i << 1) + 1] = metadata;
        line += rawToken.text;
    }
    LineTokens.convertToEndOffset(tokens, line.length);
    return createScopedLineTokens(new LineTokens(tokens, line, new LanguageIdCodec()), 0);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZXNUZXN0VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZXNUZXN0VXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTlELE9BQU8sRUFBb0Isc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFPNUUsTUFBTSxVQUFVLDBCQUEwQixDQUFDLFNBQXNCO0lBQ2hFLE1BQU0sTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLFNBQVMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDckQsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFBO0lBRWIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ3RELE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU3QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO1FBQy9CLE1BQU0sUUFBUSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksNENBQW9DLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFMUUsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUE7UUFDNUIsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQTtRQUMvQixJQUFJLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQTtJQUN0QixDQUFDO0lBRUQsVUFBVSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDbEQsT0FBTyxzQkFBc0IsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksZUFBZSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUN0RixDQUFDIn0=
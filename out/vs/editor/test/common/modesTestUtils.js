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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZXNUZXN0VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2Rlc1Rlc3RVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFOUQsT0FBTyxFQUFvQixzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQU81RSxNQUFNLFVBQVUsMEJBQTBCLENBQUMsU0FBc0I7SUFDaEUsTUFBTSxNQUFNLEdBQUcsSUFBSSxXQUFXLENBQUMsU0FBUyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUNyRCxJQUFJLElBQUksR0FBRyxFQUFFLENBQUE7SUFFYixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDdEQsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTdCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7UUFDL0IsTUFBTSxRQUFRLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSw0Q0FBb0MsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUUxRSxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQTtRQUM1QixNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFBO1FBQy9CLElBQUksSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFBO0lBQ3RCLENBQUM7SUFFRCxVQUFVLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNsRCxPQUFPLHNCQUFzQixDQUFDLElBQUksVUFBVSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxlQUFlLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ3RGLENBQUMifQ==
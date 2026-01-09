/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Token, TokenizationResult, EncodedTokenizationResult } from '../languages.js';
export const NullState = new (class {
    clone() {
        return this;
    }
    equals(other) {
        return this === other;
    }
})();
export function nullTokenize(languageId, state) {
    return new TokenizationResult([new Token(0, '', languageId)], state);
}
export function nullTokenizeEncoded(languageId, state) {
    const tokens = new Uint32Array(2);
    tokens[0] = 0;
    tokens[1] =
        ((languageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */) |
            (0 /* StandardTokenType.Other */ << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */) |
            (0 /* FontStyle.None */ << 11 /* MetadataConsts.FONT_STYLE_OFFSET */) |
            (1 /* ColorId.DefaultForeground */ << 15 /* MetadataConsts.FOREGROUND_OFFSET */) |
            (2 /* ColorId.DefaultBackground */ << 24 /* MetadataConsts.BACKGROUND_OFFSET */)) >>>
            0;
    return new EncodedTokenizationResult(tokens, state === null ? NullState : state);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVsbFRva2VuaXplLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2xhbmd1YWdlcy9udWxsVG9rZW5pemUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFBRSx5QkFBeUIsRUFBVSxNQUFNLGlCQUFpQixDQUFBO0FBUzlGLE1BQU0sQ0FBQyxNQUFNLFNBQVMsR0FBVyxJQUFJLENBQUM7SUFDOUIsS0FBSztRQUNYLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNNLE1BQU0sQ0FBQyxLQUFhO1FBQzFCLE9BQU8sSUFBSSxLQUFLLEtBQUssQ0FBQTtJQUN0QixDQUFDO0NBQ0QsQ0FBQyxFQUFFLENBQUE7QUFFSixNQUFNLFVBQVUsWUFBWSxDQUFDLFVBQWtCLEVBQUUsS0FBYTtJQUM3RCxPQUFPLElBQUksa0JBQWtCLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFDckUsQ0FBQztBQUVELE1BQU0sVUFBVSxtQkFBbUIsQ0FDbEMsVUFBc0IsRUFDdEIsS0FBb0I7SUFFcEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDakMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNiLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDUixDQUFDLENBQUMsVUFBVSw0Q0FBb0MsQ0FBQztZQUNoRCxDQUFDLDJFQUEyRCxDQUFDO1lBQzdELENBQUMsbUVBQWtELENBQUM7WUFDcEQsQ0FBQyw4RUFBNkQsQ0FBQztZQUMvRCxDQUFDLDhFQUE2RCxDQUFDLENBQUM7WUFDakUsQ0FBQyxDQUFBO0lBRUYsT0FBTyxJQUFJLHlCQUF5QixDQUFDLE1BQU0sRUFBRSxLQUFLLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQ2pGLENBQUMifQ==
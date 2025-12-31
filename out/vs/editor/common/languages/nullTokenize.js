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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVsbFRva2VuaXplLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9sYW5ndWFnZXMvbnVsbFRva2VuaXplLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUseUJBQXlCLEVBQVUsTUFBTSxpQkFBaUIsQ0FBQTtBQVM5RixNQUFNLENBQUMsTUFBTSxTQUFTLEdBQVcsSUFBSSxDQUFDO0lBQzlCLEtBQUs7UUFDWCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDTSxNQUFNLENBQUMsS0FBYTtRQUMxQixPQUFPLElBQUksS0FBSyxLQUFLLENBQUE7SUFDdEIsQ0FBQztDQUNELENBQUMsRUFBRSxDQUFBO0FBRUosTUFBTSxVQUFVLFlBQVksQ0FBQyxVQUFrQixFQUFFLEtBQWE7SUFDN0QsT0FBTyxJQUFJLGtCQUFrQixDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO0FBQ3JFLENBQUM7QUFFRCxNQUFNLFVBQVUsbUJBQW1CLENBQ2xDLFVBQXNCLEVBQ3RCLEtBQW9CO0lBRXBCLE1BQU0sTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2pDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDYixNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ1IsQ0FBQyxDQUFDLFVBQVUsNENBQW9DLENBQUM7WUFDaEQsQ0FBQywyRUFBMkQsQ0FBQztZQUM3RCxDQUFDLG1FQUFrRCxDQUFDO1lBQ3BELENBQUMsOEVBQTZELENBQUM7WUFDL0QsQ0FBQyw4RUFBNkQsQ0FBQyxDQUFDO1lBQ2pFLENBQUMsQ0FBQTtJQUVGLE9BQU8sSUFBSSx5QkFBeUIsQ0FBQyxNQUFNLEVBQUUsS0FBSyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUNqRixDQUFDIn0=
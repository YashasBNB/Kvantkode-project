/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
export function applyDeprecatedVariableMessage(schema) {
    schema.pattern = schema.pattern || '^(?!.*\\$\\{(env|config|command)\\.)';
    schema.patternErrorMessage =
        schema.patternErrorMessage ||
            nls.localize('deprecatedVariables', "'env.', 'config.' and 'command.' are deprecated, use 'env:', 'config:' and 'command:' instead.");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlc29sdmVyVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29uZmlndXJhdGlvblJlc29sdmVyL2NvbW1vbi9jb25maWd1cmF0aW9uUmVzb2x2ZXJVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBR3pDLE1BQU0sVUFBVSw4QkFBOEIsQ0FBQyxNQUFtQjtJQUNqRSxNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLElBQUksc0NBQXNDLENBQUE7SUFDekUsTUFBTSxDQUFDLG1CQUFtQjtRQUN6QixNQUFNLENBQUMsbUJBQW1CO1lBQzFCLEdBQUcsQ0FBQyxRQUFRLENBQ1gscUJBQXFCLEVBQ3JCLGdHQUFnRyxDQUNoRyxDQUFBO0FBQ0gsQ0FBQyJ9
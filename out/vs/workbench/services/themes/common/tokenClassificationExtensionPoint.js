/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ExtensionsRegistry, } from '../../extensions/common/extensionsRegistry.js';
import { getTokenClassificationRegistry, typeAndModifierIdPattern, } from '../../../../platform/theme/common/tokenClassificationRegistry.js';
const tokenClassificationRegistry = getTokenClassificationRegistry();
const tokenTypeExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'semanticTokenTypes',
    jsonSchema: {
        description: nls.localize('contributes.semanticTokenTypes', 'Contributes semantic token types.'),
        type: 'array',
        items: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: nls.localize('contributes.semanticTokenTypes.id', 'The identifier of the semantic token type'),
                    pattern: typeAndModifierIdPattern,
                    patternErrorMessage: nls.localize('contributes.semanticTokenTypes.id.format', 'Identifiers should be in the form letterOrDigit[_-letterOrDigit]*'),
                },
                superType: {
                    type: 'string',
                    description: nls.localize('contributes.semanticTokenTypes.superType', 'The super type of the semantic token type'),
                    pattern: typeAndModifierIdPattern,
                    patternErrorMessage: nls.localize('contributes.semanticTokenTypes.superType.format', 'Super types should be in the form letterOrDigit[_-letterOrDigit]*'),
                },
                description: {
                    type: 'string',
                    description: nls.localize('contributes.color.description', 'The description of the semantic token type'),
                },
            },
        },
    },
});
const tokenModifierExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'semanticTokenModifiers',
    jsonSchema: {
        description: nls.localize('contributes.semanticTokenModifiers', 'Contributes semantic token modifiers.'),
        type: 'array',
        items: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: nls.localize('contributes.semanticTokenModifiers.id', 'The identifier of the semantic token modifier'),
                    pattern: typeAndModifierIdPattern,
                    patternErrorMessage: nls.localize('contributes.semanticTokenModifiers.id.format', 'Identifiers should be in the form letterOrDigit[_-letterOrDigit]*'),
                },
                description: {
                    description: nls.localize('contributes.semanticTokenModifiers.description', 'The description of the semantic token modifier'),
                },
            },
        },
    },
});
const tokenStyleDefaultsExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'semanticTokenScopes',
    jsonSchema: {
        description: nls.localize('contributes.semanticTokenScopes', 'Contributes semantic token scope maps.'),
        type: 'array',
        items: {
            type: 'object',
            properties: {
                language: {
                    description: nls.localize('contributes.semanticTokenScopes.languages', 'Lists the languge for which the defaults are.'),
                    type: 'string',
                },
                scopes: {
                    description: nls.localize('contributes.semanticTokenScopes.scopes', 'Maps a semantic token (described by semantic token selector) to one or more textMate scopes used to represent that token.'),
                    type: 'object',
                    additionalProperties: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                    },
                },
            },
        },
    },
});
export class TokenClassificationExtensionPoints {
    constructor() {
        function validateTypeOrModifier(contribution, extensionPoint, collector) {
            if (typeof contribution.id !== 'string' || contribution.id.length === 0) {
                collector.error(nls.localize('invalid.id', "'configuration.{0}.id' must be defined and can not be empty", extensionPoint));
                return false;
            }
            if (!contribution.id.match(typeAndModifierIdPattern)) {
                collector.error(nls.localize('invalid.id.format', "'configuration.{0}.id' must follow the pattern letterOrDigit[-_letterOrDigit]*", extensionPoint));
                return false;
            }
            const superType = contribution.superType;
            if (superType && !superType.match(typeAndModifierIdPattern)) {
                collector.error(nls.localize('invalid.superType.format', "'configuration.{0}.superType' must follow the pattern letterOrDigit[-_letterOrDigit]*", extensionPoint));
                return false;
            }
            if (typeof contribution.description !== 'string' || contribution.id.length === 0) {
                collector.error(nls.localize('invalid.description', "'configuration.{0}.description' must be defined and can not be empty", extensionPoint));
                return false;
            }
            return true;
        }
        tokenTypeExtPoint.setHandler((extensions, delta) => {
            for (const extension of delta.added) {
                const extensionValue = extension.value;
                const collector = extension.collector;
                if (!extensionValue || !Array.isArray(extensionValue)) {
                    collector.error(nls.localize('invalid.semanticTokenTypeConfiguration', "'configuration.semanticTokenType' must be an array"));
                    return;
                }
                for (const contribution of extensionValue) {
                    if (validateTypeOrModifier(contribution, 'semanticTokenType', collector)) {
                        tokenClassificationRegistry.registerTokenType(contribution.id, contribution.description, contribution.superType);
                    }
                }
            }
            for (const extension of delta.removed) {
                const extensionValue = extension.value;
                for (const contribution of extensionValue) {
                    tokenClassificationRegistry.deregisterTokenType(contribution.id);
                }
            }
        });
        tokenModifierExtPoint.setHandler((extensions, delta) => {
            for (const extension of delta.added) {
                const extensionValue = extension.value;
                const collector = extension.collector;
                if (!extensionValue || !Array.isArray(extensionValue)) {
                    collector.error(nls.localize('invalid.semanticTokenModifierConfiguration', "'configuration.semanticTokenModifier' must be an array"));
                    return;
                }
                for (const contribution of extensionValue) {
                    if (validateTypeOrModifier(contribution, 'semanticTokenModifier', collector)) {
                        tokenClassificationRegistry.registerTokenModifier(contribution.id, contribution.description);
                    }
                }
            }
            for (const extension of delta.removed) {
                const extensionValue = extension.value;
                for (const contribution of extensionValue) {
                    tokenClassificationRegistry.deregisterTokenModifier(contribution.id);
                }
            }
        });
        tokenStyleDefaultsExtPoint.setHandler((extensions, delta) => {
            for (const extension of delta.added) {
                const extensionValue = extension.value;
                const collector = extension.collector;
                if (!extensionValue || !Array.isArray(extensionValue)) {
                    collector.error(nls.localize('invalid.semanticTokenScopes.configuration', "'configuration.semanticTokenScopes' must be an array"));
                    return;
                }
                for (const contribution of extensionValue) {
                    if (contribution.language && typeof contribution.language !== 'string') {
                        collector.error(nls.localize('invalid.semanticTokenScopes.language', "'configuration.semanticTokenScopes.language' must be a string"));
                        continue;
                    }
                    if (!contribution.scopes || typeof contribution.scopes !== 'object') {
                        collector.error(nls.localize('invalid.semanticTokenScopes.scopes', "'configuration.semanticTokenScopes.scopes' must be defined as an object"));
                        continue;
                    }
                    for (const selectorString in contribution.scopes) {
                        const tmScopes = contribution.scopes[selectorString];
                        if (!Array.isArray(tmScopes) || tmScopes.some((l) => typeof l !== 'string')) {
                            collector.error(nls.localize('invalid.semanticTokenScopes.scopes.value', "'configuration.semanticTokenScopes.scopes' values must be an array of strings"));
                            continue;
                        }
                        try {
                            const selector = tokenClassificationRegistry.parseTokenSelector(selectorString, contribution.language);
                            tokenClassificationRegistry.registerTokenStyleDefault(selector, {
                                scopesToProbe: tmScopes.map((s) => s.split(' ')),
                            });
                        }
                        catch (e) {
                            collector.error(nls.localize('invalid.semanticTokenScopes.scopes.selector', "configuration.semanticTokenScopes.scopes': Problems parsing selector {0}.", selectorString));
                            // invalid selector, ignore
                        }
                    }
                }
            }
            for (const extension of delta.removed) {
                const extensionValue = extension.value;
                for (const contribution of extensionValue) {
                    for (const selectorString in contribution.scopes) {
                        const tmScopes = contribution.scopes[selectorString];
                        try {
                            const selector = tokenClassificationRegistry.parseTokenSelector(selectorString, contribution.language);
                            tokenClassificationRegistry.registerTokenStyleDefault(selector, {
                                scopesToProbe: tmScopes.map((s) => s.split(' ')),
                            });
                        }
                        catch (e) {
                            // invalid selector, ignore
                        }
                    }
                }
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5DbGFzc2lmaWNhdGlvbkV4dGVuc2lvblBvaW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9jb21tb24vdG9rZW5DbGFzc2lmaWNhdGlvbkV4dGVuc2lvblBvaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFDTiw4QkFBOEIsRUFFOUIsd0JBQXdCLEdBQ3hCLE1BQU0sa0VBQWtFLENBQUE7QUFrQnpFLE1BQU0sMkJBQTJCLEdBQWlDLDhCQUE4QixFQUFFLENBQUE7QUFFbEcsTUFBTSxpQkFBaUIsR0FBRyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBNkI7SUFDL0YsY0FBYyxFQUFFLG9CQUFvQjtJQUNwQyxVQUFVLEVBQUU7UUFDWCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsZ0NBQWdDLEVBQ2hDLG1DQUFtQyxDQUNuQztRQUNELElBQUksRUFBRSxPQUFPO1FBQ2IsS0FBSyxFQUFFO1lBQ04sSUFBSSxFQUFFLFFBQVE7WUFDZCxVQUFVLEVBQUU7Z0JBQ1gsRUFBRSxFQUFFO29CQUNILElBQUksRUFBRSxRQUFRO29CQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixtQ0FBbUMsRUFDbkMsMkNBQTJDLENBQzNDO29CQUNELE9BQU8sRUFBRSx3QkFBd0I7b0JBQ2pDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLDBDQUEwQyxFQUMxQyxtRUFBbUUsQ0FDbkU7aUJBQ0Q7Z0JBQ0QsU0FBUyxFQUFFO29CQUNWLElBQUksRUFBRSxRQUFRO29CQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QiwwQ0FBMEMsRUFDMUMsMkNBQTJDLENBQzNDO29CQUNELE9BQU8sRUFBRSx3QkFBd0I7b0JBQ2pDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLGlEQUFpRCxFQUNqRCxtRUFBbUUsQ0FDbkU7aUJBQ0Q7Z0JBQ0QsV0FBVyxFQUFFO29CQUNaLElBQUksRUFBRSxRQUFRO29CQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QiwrQkFBK0IsRUFDL0IsNENBQTRDLENBQzVDO2lCQUNEO2FBQ0Q7U0FDRDtLQUNEO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsTUFBTSxxQkFBcUIsR0FBRyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FFckU7SUFDRCxjQUFjLEVBQUUsd0JBQXdCO0lBQ3hDLFVBQVUsRUFBRTtRQUNYLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixvQ0FBb0MsRUFDcEMsdUNBQXVDLENBQ3ZDO1FBQ0QsSUFBSSxFQUFFLE9BQU87UUFDYixLQUFLLEVBQUU7WUFDTixJQUFJLEVBQUUsUUFBUTtZQUNkLFVBQVUsRUFBRTtnQkFDWCxFQUFFLEVBQUU7b0JBQ0gsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHVDQUF1QyxFQUN2QywrQ0FBK0MsQ0FDL0M7b0JBQ0QsT0FBTyxFQUFFLHdCQUF3QjtvQkFDakMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDaEMsOENBQThDLEVBQzlDLG1FQUFtRSxDQUNuRTtpQkFDRDtnQkFDRCxXQUFXLEVBQUU7b0JBQ1osV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLGdEQUFnRCxFQUNoRCxnREFBZ0QsQ0FDaEQ7aUJBQ0Q7YUFDRDtTQUNEO0tBQ0Q7Q0FDRCxDQUFDLENBQUE7QUFFRixNQUFNLDBCQUEwQixHQUFHLGtCQUFrQixDQUFDLHNCQUFzQixDQUUxRTtJQUNELGNBQWMsRUFBRSxxQkFBcUI7SUFDckMsVUFBVSxFQUFFO1FBQ1gsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLGlDQUFpQyxFQUNqQyx3Q0FBd0MsQ0FDeEM7UUFDRCxJQUFJLEVBQUUsT0FBTztRQUNiLEtBQUssRUFBRTtZQUNOLElBQUksRUFBRSxRQUFRO1lBQ2QsVUFBVSxFQUFFO2dCQUNYLFFBQVEsRUFBRTtvQkFDVCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsMkNBQTJDLEVBQzNDLCtDQUErQyxDQUMvQztvQkFDRCxJQUFJLEVBQUUsUUFBUTtpQkFDZDtnQkFDRCxNQUFNLEVBQUU7b0JBQ1AsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHdDQUF3QyxFQUN4QywySEFBMkgsQ0FDM0g7b0JBQ0QsSUFBSSxFQUFFLFFBQVE7b0JBQ2Qsb0JBQW9CLEVBQUU7d0JBQ3JCLElBQUksRUFBRSxPQUFPO3dCQUNiLEtBQUssRUFBRTs0QkFDTixJQUFJLEVBQUUsUUFBUTt5QkFDZDtxQkFDRDtpQkFDRDthQUNEO1NBQ0Q7S0FDRDtDQUNELENBQUMsQ0FBQTtBQUVGLE1BQU0sT0FBTyxrQ0FBa0M7SUFDOUM7UUFDQyxTQUFTLHNCQUFzQixDQUM5QixZQUFxRSxFQUNyRSxjQUFzQixFQUN0QixTQUFvQztZQUVwQyxJQUFJLE9BQU8sWUFBWSxDQUFDLEVBQUUsS0FBSyxRQUFRLElBQUksWUFBWSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3pFLFNBQVMsQ0FBQyxLQUFLLENBQ2QsR0FBRyxDQUFDLFFBQVEsQ0FDWCxZQUFZLEVBQ1osNkRBQTZELEVBQzdELGNBQWMsQ0FDZCxDQUNELENBQUE7Z0JBQ0QsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBQ0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQztnQkFDdEQsU0FBUyxDQUFDLEtBQUssQ0FDZCxHQUFHLENBQUMsUUFBUSxDQUNYLG1CQUFtQixFQUNuQixnRkFBZ0YsRUFDaEYsY0FBYyxDQUNkLENBQ0QsQ0FBQTtnQkFDRCxPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7WUFDRCxNQUFNLFNBQVMsR0FBSSxZQUF5QyxDQUFDLFNBQVMsQ0FBQTtZQUN0RSxJQUFJLFNBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDO2dCQUM3RCxTQUFTLENBQUMsS0FBSyxDQUNkLEdBQUcsQ0FBQyxRQUFRLENBQ1gsMEJBQTBCLEVBQzFCLHVGQUF1RixFQUN2RixjQUFjLENBQ2QsQ0FDRCxDQUFBO2dCQUNELE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztZQUNELElBQUksT0FBTyxZQUFZLENBQUMsV0FBVyxLQUFLLFFBQVEsSUFBSSxZQUFZLENBQUMsRUFBRSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDbEYsU0FBUyxDQUFDLEtBQUssQ0FDZCxHQUFHLENBQUMsUUFBUSxDQUNYLHFCQUFxQixFQUNyQixzRUFBc0UsRUFDdEUsY0FBYyxDQUNkLENBQ0QsQ0FBQTtnQkFDRCxPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDbEQsS0FBSyxNQUFNLFNBQVMsSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3JDLE1BQU0sY0FBYyxHQUErQixTQUFTLENBQUMsS0FBSyxDQUFBO2dCQUNsRSxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFBO2dCQUVyQyxJQUFJLENBQUMsY0FBYyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO29CQUN2RCxTQUFTLENBQUMsS0FBSyxDQUNkLEdBQUcsQ0FBQyxRQUFRLENBQ1gsd0NBQXdDLEVBQ3hDLG9EQUFvRCxDQUNwRCxDQUNELENBQUE7b0JBQ0QsT0FBTTtnQkFDUCxDQUFDO2dCQUNELEtBQUssTUFBTSxZQUFZLElBQUksY0FBYyxFQUFFLENBQUM7b0JBQzNDLElBQUksc0JBQXNCLENBQUMsWUFBWSxFQUFFLG1CQUFtQixFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUM7d0JBQzFFLDJCQUEyQixDQUFDLGlCQUFpQixDQUM1QyxZQUFZLENBQUMsRUFBRSxFQUNmLFlBQVksQ0FBQyxXQUFXLEVBQ3hCLFlBQVksQ0FBQyxTQUFTLENBQ3RCLENBQUE7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUNELEtBQUssTUFBTSxTQUFTLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN2QyxNQUFNLGNBQWMsR0FBK0IsU0FBUyxDQUFDLEtBQUssQ0FBQTtnQkFDbEUsS0FBSyxNQUFNLFlBQVksSUFBSSxjQUFjLEVBQUUsQ0FBQztvQkFDM0MsMkJBQTJCLENBQUMsbUJBQW1CLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUNqRSxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0YscUJBQXFCLENBQUMsVUFBVSxDQUFDLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ3RELEtBQUssTUFBTSxTQUFTLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNyQyxNQUFNLGNBQWMsR0FBbUMsU0FBUyxDQUFDLEtBQUssQ0FBQTtnQkFDdEUsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQTtnQkFFckMsSUFBSSxDQUFDLGNBQWMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztvQkFDdkQsU0FBUyxDQUFDLEtBQUssQ0FDZCxHQUFHLENBQUMsUUFBUSxDQUNYLDRDQUE0QyxFQUM1Qyx3REFBd0QsQ0FDeEQsQ0FDRCxDQUFBO29CQUNELE9BQU07Z0JBQ1AsQ0FBQztnQkFDRCxLQUFLLE1BQU0sWUFBWSxJQUFJLGNBQWMsRUFBRSxDQUFDO29CQUMzQyxJQUFJLHNCQUFzQixDQUFDLFlBQVksRUFBRSx1QkFBdUIsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDO3dCQUM5RSwyQkFBMkIsQ0FBQyxxQkFBcUIsQ0FDaEQsWUFBWSxDQUFDLEVBQUUsRUFDZixZQUFZLENBQUMsV0FBVyxDQUN4QixDQUFBO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFDRCxLQUFLLE1BQU0sU0FBUyxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDdkMsTUFBTSxjQUFjLEdBQW1DLFNBQVMsQ0FBQyxLQUFLLENBQUE7Z0JBQ3RFLEtBQUssTUFBTSxZQUFZLElBQUksY0FBYyxFQUFFLENBQUM7b0JBQzNDLDJCQUEyQixDQUFDLHVCQUF1QixDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDckUsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUNGLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUMzRCxLQUFLLE1BQU0sU0FBUyxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDckMsTUFBTSxjQUFjLEdBQXVDLFNBQVMsQ0FBQyxLQUFLLENBQUE7Z0JBQzFFLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUE7Z0JBRXJDLElBQUksQ0FBQyxjQUFjLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7b0JBQ3ZELFNBQVMsQ0FBQyxLQUFLLENBQ2QsR0FBRyxDQUFDLFFBQVEsQ0FDWCwyQ0FBMkMsRUFDM0Msc0RBQXNELENBQ3RELENBQ0QsQ0FBQTtvQkFDRCxPQUFNO2dCQUNQLENBQUM7Z0JBQ0QsS0FBSyxNQUFNLFlBQVksSUFBSSxjQUFjLEVBQUUsQ0FBQztvQkFDM0MsSUFBSSxZQUFZLENBQUMsUUFBUSxJQUFJLE9BQU8sWUFBWSxDQUFDLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQzt3QkFDeEUsU0FBUyxDQUFDLEtBQUssQ0FDZCxHQUFHLENBQUMsUUFBUSxDQUNYLHNDQUFzQyxFQUN0QywrREFBK0QsQ0FDL0QsQ0FDRCxDQUFBO3dCQUNELFNBQVE7b0JBQ1QsQ0FBQztvQkFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sSUFBSSxPQUFPLFlBQVksQ0FBQyxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7d0JBQ3JFLFNBQVMsQ0FBQyxLQUFLLENBQ2QsR0FBRyxDQUFDLFFBQVEsQ0FDWCxvQ0FBb0MsRUFDcEMseUVBQXlFLENBQ3pFLENBQ0QsQ0FBQTt3QkFDRCxTQUFRO29CQUNULENBQUM7b0JBQ0QsS0FBSyxNQUFNLGNBQWMsSUFBSSxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUM7d0JBQ2xELE1BQU0sUUFBUSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUE7d0JBQ3BELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLFFBQVEsQ0FBQyxFQUFFLENBQUM7NEJBQzdFLFNBQVMsQ0FBQyxLQUFLLENBQ2QsR0FBRyxDQUFDLFFBQVEsQ0FDWCwwQ0FBMEMsRUFDMUMsK0VBQStFLENBQy9FLENBQ0QsQ0FBQTs0QkFDRCxTQUFRO3dCQUNULENBQUM7d0JBQ0QsSUFBSSxDQUFDOzRCQUNKLE1BQU0sUUFBUSxHQUFHLDJCQUEyQixDQUFDLGtCQUFrQixDQUM5RCxjQUFjLEVBQ2QsWUFBWSxDQUFDLFFBQVEsQ0FDckIsQ0FBQTs0QkFDRCwyQkFBMkIsQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLEVBQUU7Z0NBQy9ELGFBQWEsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzZCQUNoRCxDQUFDLENBQUE7d0JBQ0gsQ0FBQzt3QkFBQyxPQUFPLENBQUMsRUFBRSxDQUFDOzRCQUNaLFNBQVMsQ0FBQyxLQUFLLENBQ2QsR0FBRyxDQUFDLFFBQVEsQ0FDWCw2Q0FBNkMsRUFDN0MsMkVBQTJFLEVBQzNFLGNBQWMsQ0FDZCxDQUNELENBQUE7NEJBQ0QsMkJBQTJCO3dCQUM1QixDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFDRCxLQUFLLE1BQU0sU0FBUyxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDdkMsTUFBTSxjQUFjLEdBQXVDLFNBQVMsQ0FBQyxLQUFLLENBQUE7Z0JBQzFFLEtBQUssTUFBTSxZQUFZLElBQUksY0FBYyxFQUFFLENBQUM7b0JBQzNDLEtBQUssTUFBTSxjQUFjLElBQUksWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDO3dCQUNsRCxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFBO3dCQUNwRCxJQUFJLENBQUM7NEJBQ0osTUFBTSxRQUFRLEdBQUcsMkJBQTJCLENBQUMsa0JBQWtCLENBQzlELGNBQWMsRUFDZCxZQUFZLENBQUMsUUFBUSxDQUNyQixDQUFBOzRCQUNELDJCQUEyQixDQUFDLHlCQUF5QixDQUFDLFFBQVEsRUFBRTtnQ0FDL0QsYUFBYSxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7NkJBQ2hELENBQUMsQ0FBQTt3QkFDSCxDQUFDO3dCQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7NEJBQ1osMkJBQTJCO3dCQUM1QixDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCJ9
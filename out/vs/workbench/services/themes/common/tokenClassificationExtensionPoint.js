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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5DbGFzc2lmaWNhdGlvbkV4dGVuc2lvblBvaW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2NvbW1vbi90b2tlbkNsYXNzaWZpY2F0aW9uRXh0ZW5zaW9uUG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQ04sa0JBQWtCLEdBRWxCLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUNOLDhCQUE4QixFQUU5Qix3QkFBd0IsR0FDeEIsTUFBTSxrRUFBa0UsQ0FBQTtBQWtCekUsTUFBTSwyQkFBMkIsR0FBaUMsOEJBQThCLEVBQUUsQ0FBQTtBQUVsRyxNQUFNLGlCQUFpQixHQUFHLGtCQUFrQixDQUFDLHNCQUFzQixDQUE2QjtJQUMvRixjQUFjLEVBQUUsb0JBQW9CO0lBQ3BDLFVBQVUsRUFBRTtRQUNYLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixnQ0FBZ0MsRUFDaEMsbUNBQW1DLENBQ25DO1FBQ0QsSUFBSSxFQUFFLE9BQU87UUFDYixLQUFLLEVBQUU7WUFDTixJQUFJLEVBQUUsUUFBUTtZQUNkLFVBQVUsRUFBRTtnQkFDWCxFQUFFLEVBQUU7b0JBQ0gsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLG1DQUFtQyxFQUNuQywyQ0FBMkMsQ0FDM0M7b0JBQ0QsT0FBTyxFQUFFLHdCQUF3QjtvQkFDakMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDaEMsMENBQTBDLEVBQzFDLG1FQUFtRSxDQUNuRTtpQkFDRDtnQkFDRCxTQUFTLEVBQUU7b0JBQ1YsSUFBSSxFQUFFLFFB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
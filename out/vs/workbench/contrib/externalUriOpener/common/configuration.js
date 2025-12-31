/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import * as nls from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
export const defaultExternalUriOpenerId = 'default';
export const externalUriOpenersSettingId = 'workbench.externalUriOpeners';
const externalUriOpenerIdSchemaAddition = {
    type: 'string',
    enum: [],
};
const exampleUriPatterns = `
- \`https://microsoft.com\`: Matches this specific domain using https
- \`https://microsoft.com:8080\`: Matches this specific domain on this port using https
- \`https://microsoft.com:*\`: Matches this specific domain on any port using https
- \`https://microsoft.com/foo\`: Matches \`https://microsoft.com/foo\` and \`https://microsoft.com/foo/bar\`, but not \`https://microsoft.com/foobar\` or \`https://microsoft.com/bar\`
- \`https://*.microsoft.com\`: Match all domains ending in \`microsoft.com\` using https
- \`microsoft.com\`: Match this specific domain using either http or https
- \`*.microsoft.com\`: Match all domains ending in \`microsoft.com\` using either http or https
- \`http://192.168.0.1\`: Matches this specific IP using http
- \`http://192.168.0.*\`: Matches all IP's with this prefix using http
- \`*\`: Match all domains using either http or https`;
export const externalUriOpenersConfigurationNode = {
    ...workbenchConfigurationNodeBase,
    properties: {
        [externalUriOpenersSettingId]: {
            type: 'object',
            markdownDescription: nls.localize('externalUriOpeners', 'Configure the opener to use for external URIs (http, https).'),
            defaultSnippets: [
                {
                    body: {
                        'example.com': '$1',
                    },
                },
            ],
            additionalProperties: {
                anyOf: [
                    {
                        type: 'string',
                        markdownDescription: nls.localize('externalUriOpeners.uri', 'Map URI pattern to an opener id.\nExample patterns: \n{0}', exampleUriPatterns),
                    },
                    {
                        type: 'string',
                        markdownDescription: nls.localize('externalUriOpeners.uri', 'Map URI pattern to an opener id.\nExample patterns: \n{0}', exampleUriPatterns),
                        enum: [defaultExternalUriOpenerId],
                        enumDescriptions: [
                            nls.localize('externalUriOpeners.defaultId', "Open using VS Code's standard opener."),
                        ],
                    },
                    externalUriOpenerIdSchemaAddition,
                ],
            },
        },
    },
};
export function updateContributedOpeners(enumValues, enumDescriptions) {
    externalUriOpenerIdSchemaAddition.enum = enumValues;
    externalUriOpenerIdSchemaAddition.enumDescriptions = enumDescriptions;
    Registry.as(Extensions.Configuration).notifyConfigurationSchemaUpdated(externalUriOpenersConfigurationNode);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVybmFsVXJpT3BlbmVyL2NvbW1vbi9jb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFHTixVQUFVLEdBQ1YsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUUzRSxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxTQUFTLENBQUE7QUFFbkQsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsOEJBQThCLENBQUE7QUFNekUsTUFBTSxpQ0FBaUMsR0FBZ0I7SUFDdEQsSUFBSSxFQUFFLFFBQVE7SUFDZCxJQUFJLEVBQUUsRUFBRTtDQUNSLENBQUE7QUFFRCxNQUFNLGtCQUFrQixHQUFHOzs7Ozs7Ozs7O3NEQVUyQixDQUFBO0FBRXRELE1BQU0sQ0FBQyxNQUFNLG1DQUFtQyxHQUF1QjtJQUN0RSxHQUFHLDhCQUE4QjtJQUNqQyxVQUFVLEVBQUU7UUFDWCxDQUFDLDJCQUEyQixDQUFDLEVBQUU7WUFDOUIsSUFBSSxFQUFFLFFBQVE7WUFDZCxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNoQyxvQkFBb0IsRUFDcEIsOERBQThELENBQzlEO1lBQ0QsZUFBZSxFQUFFO2dCQUNoQjtvQkFDQyxJQUFJLEVBQUU7d0JBQ0wsYUFBYSxFQUFFLElBQUk7cUJBQ25CO2lCQUNEO2FBQ0Q7WUFDRCxvQkFBb0IsRUFBRTtnQkFDckIsS0FBSyxFQUFFO29CQUNOO3dCQUNDLElBQUksRUFBRSxRQUFRO3dCQUNkLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLHdCQUF3QixFQUN4QiwyREFBMkQsRUFDM0Qsa0JBQWtCLENBQ2xCO3FCQUNEO29CQUNEO3dCQUNDLElBQUksRUFBRSxRQUFRO3dCQUNkLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLHdCQUF3QixFQUN4QiwyREFBMkQsRUFDM0Qsa0JBQWtCLENBQ2xCO3dCQUNELElBQUksRUFBRSxDQUFDLDBCQUEwQixDQUFDO3dCQUNsQyxnQkFBZ0IsRUFBRTs0QkFDakIsR0FBRyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSx1Q0FBdUMsQ0FBQzt5QkFDckY7cUJBQ0Q7b0JBQ0QsaUNBQWlDO2lCQUNqQzthQUNEO1NBQ0Q7S0FDRDtDQUNELENBQUE7QUFFRCxNQUFNLFVBQVUsd0JBQXdCLENBQUMsVUFBb0IsRUFBRSxnQkFBMEI7SUFDeEYsaUNBQWlDLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQTtJQUNuRCxpQ0FBaUMsQ0FBQyxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQTtJQUVyRSxRQUFRLENBQUMsRUFBRSxDQUF5QixVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsZ0NBQWdDLENBQzdGLG1DQUFtQyxDQUNuQyxDQUFBO0FBQ0YsQ0FBQyJ9
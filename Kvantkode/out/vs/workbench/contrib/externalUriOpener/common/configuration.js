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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZXJuYWxVcmlPcGVuZXIvY29tbW9uL2NvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUdOLFVBQVUsR0FDVixNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFFekMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRTNFLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLFNBQVMsQ0FBQTtBQUVuRCxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyw4QkFBOEIsQ0FBQTtBQU16RSxNQUFNLGlDQUFpQyxHQUFnQjtJQUN0RCxJQUFJLEVBQUUsUUFBUTtJQUNkLElBQUksRUFBRSxFQUFFO0NBQ1IsQ0FBQTtBQUVELE1BQU0sa0JBQWtCLEdBQUc7Ozs7Ozs7Ozs7c0RBVTJCLENBQUE7QUFFdEQsTUFBTSxDQUFDLE1BQU0sbUNBQW1DLEdBQXVCO0lBQ3RFLEdBQUcsOEJBQThCO0lBQ2pDLFVBQVUsRUFBRTtRQUNYLENBQUMsMkJBQTJCLENBQUMsRUFBRTtZQUM5QixJQUFJLEVBQUUsUUFBUTtZQUNkLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLG9CQUFvQixFQUNwQiw4REFBOEQsQ0FDOUQ7WUFDRCxlQUFlLEVBQUU7Z0JBQ2hCO29CQUNDLElBQUksRUFBRTt3QkFDTCxhQUFhLEVBQUUsSUFBSTtxQkFDbkI7aUJBQ0Q7YUFDRDtZQUNELG9CQUFvQixFQUFFO2dCQUNyQixLQUFLLEVBQUU7b0JBQ047d0JBQ0MsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDaEMsd0JBQXdCLEVBQ3hCLDJEQUEyRCxFQUMzRCxrQkFBa0IsQ0FDbEI7cUJBQ0Q7b0JBQ0Q7d0JBQ0MsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDaEMsd0JBQXdCLEVBQ3hCLDJEQUEyRCxFQUMzRCxrQkFBa0IsQ0FDbEI7d0JBQ0QsSUFBSSxFQUFFLENBQUMsMEJBQTBCLENBQUM7d0JBQ2xDLGdCQUFnQixFQUFFOzRCQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLDhCQUE4QixFQUFFLHVDQUF1QyxDQUFDO3lCQUNyRjtxQkFDRDtvQkFDRCxpQ0FBaUM7aUJBQ2pDO2FBQ0Q7U0FDRDtLQUNEO0NBQ0QsQ0FBQTtBQUVELE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxVQUFvQixFQUFFLGdCQUEwQjtJQUN4RixpQ0FBaUMsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFBO0lBQ25ELGlDQUFpQyxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixDQUFBO0lBRXJFLFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxnQ0FBZ0MsQ0FDN0YsbUNBQW1DLENBQ25DLENBQUE7QUFDRixDQUFDIn0=
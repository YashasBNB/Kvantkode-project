/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../nls.js';
import { ExtensionsRegistry } from '../../services/extensions/common/extensionsRegistry.js';
import * as resources from '../../../base/common/resources.js';
import { isString } from '../../../base/common/types.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Extensions, } from '../../services/extensionManagement/common/extensionFeatures.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
const configurationExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'jsonValidation',
    defaultExtensionKind: ['workspace', 'web'],
    jsonSchema: {
        description: nls.localize('contributes.jsonValidation', 'Contributes json schema configuration.'),
        type: 'array',
        defaultSnippets: [{ body: [{ fileMatch: '${1:file.json}', url: '${2:url}' }] }],
        items: {
            type: 'object',
            defaultSnippets: [{ body: { fileMatch: '${1:file.json}', url: '${2:url}' } }],
            properties: {
                fileMatch: {
                    type: ['string', 'array'],
                    description: nls.localize('contributes.jsonValidation.fileMatch', 'The file pattern (or an array of patterns) to match, for example "package.json" or "*.launch". Exclusion patterns start with \'!\''),
                    items: {
                        type: ['string'],
                    },
                },
                url: {
                    description: nls.localize('contributes.jsonValidation.url', "A schema URL ('http:', 'https:') or relative path to the extension folder ('./')."),
                    type: 'string',
                },
            },
        },
    },
});
export class JSONValidationExtensionPoint {
    constructor() {
        configurationExtPoint.setHandler((extensions) => {
            for (const extension of extensions) {
                const extensionValue = extension.value;
                const collector = extension.collector;
                const extensionLocation = extension.description.extensionLocation;
                if (!extensionValue || !Array.isArray(extensionValue)) {
                    collector.error(nls.localize('invalid.jsonValidation', "'configuration.jsonValidation' must be a array"));
                    return;
                }
                extensionValue.forEach((extension) => {
                    if (!isString(extension.fileMatch) &&
                        !(Array.isArray(extension.fileMatch) && extension.fileMatch.every(isString))) {
                        collector.error(nls.localize('invalid.fileMatch', "'configuration.jsonValidation.fileMatch' must be defined as a string or an array of strings."));
                        return;
                    }
                    const uri = extension.url;
                    if (!isString(uri)) {
                        collector.error(nls.localize('invalid.url', "'configuration.jsonValidation.url' must be a URL or relative path"));
                        return;
                    }
                    if (uri.startsWith('./')) {
                        try {
                            const colorThemeLocation = resources.joinPath(extensionLocation, uri);
                            if (!resources.isEqualOrParent(colorThemeLocation, extensionLocation)) {
                                collector.warn(nls.localize('invalid.path.1', "Expected `contributes.{0}.url` ({1}) to be included inside extension's folder ({2}). This might make the extension non-portable.", configurationExtPoint.name, colorThemeLocation.toString(), extensionLocation.path));
                            }
                        }
                        catch (e) {
                            collector.error(nls.localize('invalid.url.fileschema', "'configuration.jsonValidation.url' is an invalid relative URL: {0}", e.message));
                        }
                    }
                    else if (!/^[^:/?#]+:\/\//.test(uri)) {
                        collector.error(nls.localize('invalid.url.schema', "'configuration.jsonValidation.url' must be an absolute URL or start with './'  to reference schemas located in the extension."));
                        return;
                    }
                });
            }
        });
    }
}
class JSONValidationDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.jsonValidation;
    }
    render(manifest) {
        const contrib = manifest.contributes?.jsonValidation || [];
        if (!contrib.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [nls.localize('fileMatch', 'File Match'), nls.localize('schema', 'Schema')];
        const rows = contrib.map((v) => {
            return [
                new MarkdownString().appendMarkdown(`\`${Array.isArray(v.fileMatch) ? v.fileMatch.join(', ') : v.fileMatch}\``),
                v.url,
            ];
        });
        return {
            data: {
                headers,
                rows,
            },
            dispose: () => { },
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'jsonValidation',
    label: nls.localize('jsonValidation', 'JSON Validation'),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(JSONValidationDataRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvblZhbGlkYXRpb25FeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2pzb25WYWxpZGF0aW9uRXh0ZW5zaW9uUG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUMzRixPQUFPLEtBQUssU0FBUyxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUNOLFVBQVUsR0FNVixNQUFNLGdFQUFnRSxDQUFBO0FBRXZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBT3BFLE1BQU0scUJBQXFCLEdBQUcsa0JBQWtCLENBQUMsc0JBQXNCLENBRXJFO0lBQ0QsY0FBYyxFQUFFLGdCQUFnQjtJQUNoQyxvQkFBb0IsRUFBRSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUM7SUFDMUMsVUFBVSxFQUFFO1FBQ1gsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLDRCQUE0QixFQUM1Qix3Q0FBd0MsQ0FDeEM7UUFDRCxJQUFJLEVBQUUsT0FBTztRQUNiLGVBQWUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBRSxD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
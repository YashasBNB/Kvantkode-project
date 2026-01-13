/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { Extensions, asCssVariableName, } from '../../../../../platform/theme/common/colorRegistry.js';
import { asTextOrError } from '../../../../../platform/request/common/request.js';
import * as pfs from '../../../../../base/node/pfs.js';
import * as path from '../../../../../base/common/path.js';
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { RequestService } from '../../../../../platform/request/node/requestService.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
// eslint-disable-next-line local/code-import-patterns
import '../../../../workbench.desktop.main.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { FileAccess } from '../../../../../base/common/network.js';
export const experimental = []; // 'settings.modifiedItemForeground', 'editorUnnecessary.foreground' ];
const knwonVariablesFileName = 'vscode-known-variables.json';
suite('Color Registry', function () {
    test(`update colors in ${knwonVariablesFileName}`, async function () {
        const varFilePath = FileAccess.asFileUri(`vs/../../build/lib/stylelint/${knwonVariablesFileName}`).fsPath;
        const content = (await fs.promises.readFile(varFilePath)).toString();
        const variablesInfo = JSON.parse(content);
        const colorsArray = variablesInfo.colors;
        assert.ok(colorsArray && colorsArray.length > 0, '${knwonVariablesFileName} contains no color descriptions');
        const colors = new Set(colorsArray);
        const updatedColors = [];
        const missing = [];
        const themingRegistry = Registry.as(Extensions.ColorContribution);
        for (const color of themingRegistry.getColors()) {
            const id = asCssVariableName(color.id);
            if (!colors.has(id)) {
                if (!color.deprecationMessage) {
                    missing.push(id);
                }
            }
            else {
                colors.delete(id);
            }
            updatedColors.push(id);
        }
        const superfluousKeys = [...colors.keys()];
        let errorText = '';
        if (missing.length > 0) {
            errorText += `\n\Adding the following colors:\n\n${JSON.stringify(missing, undefined, '\t')}\n`;
        }
        if (superfluousKeys.length > 0) {
            errorText += `\n\Removing the following colors:\n\n${superfluousKeys.join('\n')}\n`;
        }
        if (errorText.length > 0) {
            updatedColors.sort();
            variablesInfo.colors = updatedColors;
            await pfs.Promises.writeFile(varFilePath, JSON.stringify(variablesInfo, undefined, '\t'));
            assert.fail(`\n\Updating ${path.normalize(varFilePath)}.\nPlease verify and commit.\n\n${errorText}\n`);
        }
    });
    test('all colors listed in theme-color.md', async function () {
        // avoid importing the TestEnvironmentService as it brings in a duplicate registration of the file editor input factory.
        const environmentService = new (class extends mock() {
            constructor() {
                super(...arguments);
                this.args = { _: [] };
            }
        })();
        const docUrl = 'https://raw.githubusercontent.com/microsoft/vscode-docs/main/api/references/theme-color.md';
        const reqContext = await new RequestService('local', new TestConfigurationService(), environmentService, new NullLogService()).request({ url: docUrl }, CancellationToken.None);
        const content = (await asTextOrError(reqContext));
        const expression = /-\s*\`([\w\.]+)\`: (.*)/g;
        let m;
        const colorsInDoc = Object.create(null);
        let nColorsInDoc = 0;
        while ((m = expression.exec(content))) {
            colorsInDoc[m[1]] = { description: m[2], offset: m.index, length: m.length };
            nColorsInDoc++;
        }
        assert.ok(nColorsInDoc > 0, 'theme-color.md contains to color descriptions');
        const missing = Object.create(null);
        const descriptionDiffs = Object.create(null);
        const themingRegistry = Registry.as(Extensions.ColorContribution);
        for (const color of themingRegistry.getColors()) {
            if (!colorsInDoc[color.id]) {
                if (!color.deprecationMessage) {
                    missing[color.id] = getDescription(color);
                }
            }
            else {
                const docDescription = colorsInDoc[color.id].description;
                const specDescription = getDescription(color);
                if (docDescription !== specDescription) {
                    descriptionDiffs[color.id] = { docDescription, specDescription };
                }
                delete colorsInDoc[color.id];
            }
        }
        const colorsInExtensions = await getColorsFromExtension();
        for (const colorId in colorsInExtensions) {
            if (!colorsInDoc[colorId]) {
                missing[colorId] = colorsInExtensions[colorId];
            }
            else {
                delete colorsInDoc[colorId];
            }
        }
        for (const colorId of experimental) {
            if (missing[colorId]) {
                delete missing[colorId];
            }
            if (colorsInDoc[colorId]) {
                assert.fail(`Color ${colorId} found in doc but marked experimental. Please remove from experimental list.`);
            }
        }
        const superfluousKeys = Object.keys(colorsInDoc);
        const undocumentedKeys = Object.keys(missing).map((k) => `\`${k}\`: ${missing[k]}`);
        let errorText = '';
        if (undocumentedKeys.length > 0) {
            errorText += `\n\nAdd the following colors:\n\n${undocumentedKeys.join('\n')}\n`;
        }
        if (superfluousKeys.length > 0) {
            errorText += `\n\Remove the following colors:\n\n${superfluousKeys.join('\n')}\n`;
        }
        if (errorText.length > 0) {
            assert.fail(`\n\nOpen https://github.dev/microsoft/vscode-docs/blob/vnext/api/references/theme-color.md#50${errorText}`);
        }
    });
});
function getDescription(color) {
    let specDescription = color.description;
    if (color.deprecationMessage) {
        specDescription = specDescription + ' ' + color.deprecationMessage;
    }
    return specDescription;
}
async function getColorsFromExtension() {
    const extPath = FileAccess.asFileUri('vs/../../extensions').fsPath;
    const extFolders = await pfs.Promises.readDirsInDir(extPath);
    const result = Object.create(null);
    for (const folder of extFolders) {
        try {
            const packageJSON = JSON.parse((await fs.promises.readFile(path.join(extPath, folder, 'package.json'))).toString());
            const contributes = packageJSON['contributes'];
            if (contributes) {
                const colors = contributes['colors'];
                if (colors) {
                    for (const color of colors) {
                        const colorId = color['id'];
                        if (colorId) {
                            result[colorId] = colorId['description'];
                        }
                    }
                }
            }
        }
        catch (e) {
            // ignore
        }
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JSZWdpc3RyeS5yZWxlYXNlVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGhlbWVzL3Rlc3Qvbm9kZS9jb2xvclJlZ2lzdHJ5LnJlbGVhc2VUZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUM5RSxPQUFPLEVBRU4sVUFBVSxFQUVWLGlCQUFpQixHQUNqQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sS0FBSyxJQUFJLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN2RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxzREFBc0Q7QUFDdEQsT0FBTyx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRTlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQWFsRSxNQUFNLENBQUMsTUFBTSxZQUFZLEdBQWEsRUFBRSxDQUFBLENBQUMsdUVBQXVFO0FBRWhILE1BQU0s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
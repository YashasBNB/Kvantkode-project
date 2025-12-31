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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JSZWdpc3RyeS5yZWxlYXNlVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3RoZW1lcy90ZXN0L25vZGUvY29sb3JSZWdpc3RyeS5yZWxlYXNlVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDOUUsT0FBTyxFQUVOLFVBQVUsRUFFVixpQkFBaUIsR0FDakIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEtBQUssSUFBSSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDdkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsc0RBQXNEO0FBQ3RELE9BQU8sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFhbEUsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFhLEVBQUUsQ0FBQSxDQUFDLHVFQUF1RTtBQUVoSCxNQUFNLHNCQUFzQixHQUFHLDZCQUE2QixDQUFB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
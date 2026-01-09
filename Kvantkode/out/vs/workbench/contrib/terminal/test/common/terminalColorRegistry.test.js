/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Extensions as ThemeingExtensions, } from '../../../../../platform/theme/common/colorRegistry.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { ansiColorIdentifiers, registerColors } from '../../common/terminalColorRegistry.js';
import { Color } from '../../../../../base/common/color.js';
import { ColorScheme } from '../../../../../platform/theme/common/theme.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
registerColors();
const themingRegistry = Registry.as(ThemeingExtensions.ColorContribution);
function getMockTheme(type) {
    const theme = {
        selector: '',
        label: '',
        type: type,
        getColor: (colorId) => themingRegistry.resolveDefaultColor(colorId, theme),
        defines: () => true,
        getTokenStyleMetadata: () => undefined,
        tokenColorMap: [],
        semanticHighlighting: false,
    };
    return theme;
}
suite('Workbench - TerminalColorRegistry', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('hc colors', function () {
        const theme = getMockTheme(ColorScheme.HIGH_CONTRAST_DARK);
        const colors = ansiColorIdentifiers.map((colorId) => Color.Format.CSS.formatHexA(theme.getColor(colorId), true));
        assert.deepStrictEqual(colors, [
            '#000000',
            '#cd0000',
            '#00cd00',
            '#cdcd00',
            '#0000ee',
            '#cd00cd',
            '#00cdcd',
            '#e5e5e5',
            '#7f7f7f',
            '#ff0000',
            '#00ff00',
            '#ffff00',
            '#5c5cff',
            '#ff00ff',
            '#00ffff',
            '#ffffff',
        ], 'The high contrast terminal colors should be used when the hc theme is active');
    });
    test('light colors', function () {
        const theme = getMockTheme(ColorScheme.LIGHT);
        const colors = ansiColorIdentifiers.map((colorId) => Color.Format.CSS.formatHexA(theme.getColor(colorId), true));
        assert.deepStrictEqual(colors, [
            '#000000',
            '#cd3131',
            '#107c10',
            '#949800',
            '#0451a5',
            '#bc05bc',
            '#0598bc',
            '#555555',
            '#666666',
            '#cd3131',
            '#14ce14',
            '#b5ba00',
            '#0451a5',
            '#bc05bc',
            '#0598bc',
            '#a5a5a5',
        ], 'The light terminal colors should be used when the light theme is active');
    });
    test('dark colors', function () {
        const theme = getMockTheme(ColorScheme.DARK);
        const colors = ansiColorIdentifiers.map((colorId) => Color.Format.CSS.formatHexA(theme.getColor(colorId), true));
        assert.deepStrictEqual(colors, [
            '#000000',
            '#cd3131',
            '#0dbc79',
            '#e5e510',
            '#2472c8',
            '#bc3fbc',
            '#11a8cd',
            '#e5e5e5',
            '#666666',
            '#f14c4c',
            '#23d18b',
            '#f5f543',
            '#3b8eea',
            '#d670d6',
            '#29b8db',
            '#e5e5e5',
        ], 'The dark terminal colors should be used when a dark theme is active');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb2xvclJlZ2lzdHJ5LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvY29tbW9uL3Rlcm1pbmFsQ29sb3JSZWdpc3RyeS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQ04sVUFBVSxJQUFJLGtCQUFrQixHQUdoQyxNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFNUYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxjQUFjLEVBQUUsQ0FBQTtBQUVoQixNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFpQixrQkFBa0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0FBQ3pGLFNBQVMsWUFBWSxDQUFDLElBQWlCO0lBQ3RDLE1BQU0sS0FBSyxHQUFHO1FBQ2IsUUFBUSxFQUFFLEVBQUU7UUFDWixLQUFLLEVBQUUsRUFBRTtRQUNULElBQUksRUFBRSxJQUFJO1FBQ1YsUUFBUSxFQUFFLENBQUMsT0FBd0IsRUFBcUIsRUFBRSxDQUN6RCxlQUFlLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQztRQUNwRCxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSTtRQUNu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
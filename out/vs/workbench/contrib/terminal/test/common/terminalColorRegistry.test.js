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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb2xvclJlZ2lzdHJ5LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2NvbW1vbi90ZXJtaW5hbENvbG9yUmVnaXN0cnkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUNOLFVBQVUsSUFBSSxrQkFBa0IsR0FHaEMsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDOUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGNBQWMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRTVGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsY0FBYyxFQUFFLENBQUE7QUFFaEIsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBaUIsa0JBQWtCLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtBQUN6RixTQUFTLFlBQVksQ0FBQyxJQUFpQjtJQUN0QyxNQUFNLEtBQUssR0FBRztRQUNiLFFBQVEsRUFBRSxFQUFFO1FBQ1osS0FBSyxFQUFFLEVBQUU7UUFDVCxJQUFJLEVBQUUsSUFBSTtRQUNWLFFBQVEsRUFBRSxDQUFDLE9BQXdCLEVBQXFCLEVBQUUsQ0FDekQsZUFBZSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUM7UUFDcEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUk7UUFDbkIscUJBQXFCLEVBQUUsR0FBRyxFQUFF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
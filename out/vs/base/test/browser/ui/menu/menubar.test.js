/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { $ } from '../../../../browser/dom.js';
import { unthemedMenuStyles } from '../../../../browser/ui/menu/menu.js';
import { MenuBar } from '../../../../browser/ui/menu/menubar.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../common/utils.js';
function getButtonElementByAriaLabel(menubarElement, ariaLabel) {
    let i;
    for (i = 0; i < menubarElement.childElementCount; i++) {
        if (menubarElement.children[i].getAttribute('aria-label') === ariaLabel) {
            return menubarElement.children[i];
        }
    }
    return null;
}
function getTitleDivFromButtonDiv(menuButtonElement) {
    let i;
    for (i = 0; i < menuButtonElement.childElementCount; i++) {
        if (menuButtonElement.children[i].classList.contains('menubar-menu-title')) {
            return menuButtonElement.children[i];
        }
    }
    return null;
}
function getMnemonicFromTitleDiv(menuTitleDiv) {
    let i;
    for (i = 0; i < menuTitleDiv.childElementCount; i++) {
        if (menuTitleDiv.children[i].tagName.toLocaleLowerCase() === 'mnemonic') {
            return menuTitleDiv.children[i].textContent;
        }
    }
    return null;
}
function validateMenuBarItem(menubar, menubarContainer, label, readableLabel, mnemonic) {
    menubar.push([
        {
            actions: [],
            label: label,
        },
    ]);
    const buttonElement = getButtonElementByAriaLabel(menubarContainer, readableLabel);
    assert(buttonElement !== null, `Button element not found for ${readableLabel} button.`);
    const titleDiv = getTitleDivFromButtonDiv(buttonElement);
    assert(titleDiv !== null, `Title div not found for ${readableLabel} button.`);
    const mnem = getMnemonicFromTitleDiv(titleDiv);
    assert.strictEqual(mnem, mnemonic, 'Mnemonic not correct');
}
suite('Menubar', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const container = $('.container');
    const menubar = new MenuBar(container, {
        enableMnemonics: true,
        visibility: 'visible',
    }, unthemedMenuStyles);
    test('English File menu renders mnemonics', function () {
        validateMenuBarItem(menubar, container, '&File', 'File', 'F');
    });
    test('Russian File menu renders mnemonics', function () {
        validateMenuBarItem(menubar, container, '&Файл', 'Файл', 'Ф');
    });
    test('Chinese File menu renders mnemonics', function () {
        validateMenuBarItem(menubar, container, '文件(&F)', '文件', 'F');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvYnJvd3Nlci91aS9tZW51L21lbnViYXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzlDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUVsRixTQUFTLDJCQUEyQixDQUNuQyxjQUEyQixFQUMzQixTQUFpQjtJQUVqQixJQUFJLENBQUMsQ0FBQTtJQUNMLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsY0FBYyxDQUFDLGlCQUFpQixFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDdkQsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN6RSxPQUFPLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFnQixDQUFBO1FBQ2pELENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDO0FBRUQsU0FBUyx3QkFBd0IsQ0FBQyxpQkFBOEI7SUFDL0QsSUFBSSxDQUFDLENBQUE7SUFDTCxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGlCQUFpQixDQUFDLGlCQUFpQixFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDMUQsSUFBSSxpQkFBaUIsQ0FBQyxRQUFRLENB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
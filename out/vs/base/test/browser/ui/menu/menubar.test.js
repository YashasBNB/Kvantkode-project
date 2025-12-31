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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2Jyb3dzZXIvdWkvbWVudS9tZW51YmFyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFbEYsU0FBUywyQkFBMkIsQ0FDbkMsY0FBMkIsRUFDM0IsU0FBaUI7SUFFakIsSUFBSSxDQUFDLENBQUE7SUFDTCxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ3ZELElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDekUsT0FBTyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBZ0IsQ0FBQTtRQUNqRCxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQztBQUVELFNBQVMsd0JBQXdCLENBQUMsaUJBQThCO0lBQy9ELElBQUksQ0FBQyxDQUFBO0lBQ0wsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxpQkFBaUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzFELElBQUksaUJBQWlCLENBQUMsUUFBUSxDQUFDLENB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
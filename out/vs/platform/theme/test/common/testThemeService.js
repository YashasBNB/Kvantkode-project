/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Color } from '../../../../base/common/color.js';
import { Emitter } from '../../../../base/common/event.js';
import { ColorScheme } from '../../common/theme.js';
export class TestColorTheme {
    constructor(colors = {}, type = ColorScheme.DARK, semanticHighlighting = false) {
        this.colors = colors;
        this.type = type;
        this.semanticHighlighting = semanticHighlighting;
        this.label = 'test';
    }
    getColor(color, useDefault) {
        const value = this.colors[color];
        if (value) {
            return Color.fromHex(value);
        }
        return undefined;
    }
    defines(color) {
        throw new Error('Method not implemented.');
    }
    getTokenStyleMetadata(type, modifiers, modelLanguage) {
        return undefined;
    }
    get tokenColorMap() {
        return [];
    }
}
class TestFileIconTheme {
    constructor() {
        this.hasFileIcons = false;
        this.hasFolderIcons = false;
        this.hidesExplorerArrows = false;
    }
}
class UnthemedProductIconTheme {
    getIcon(contribution) {
        return undefined;
    }
}
export class TestThemeService {
    constructor(theme = new TestColorTheme(), fileIconTheme = new TestFileIconTheme(), productIconTheme = new UnthemedProductIconTheme()) {
        this._onThemeChange = new Emitter();
        this._onFileIconThemeChange = new Emitter();
        this._onProductIconThemeChange = new Emitter();
        this._colorTheme = theme;
        this._fileIconTheme = fileIconTheme;
        this._productIconTheme = productIconTheme;
    }
    getColorTheme() {
        return this._colorTheme;
    }
    setTheme(theme) {
        this._colorTheme = theme;
        this.fireThemeChange();
    }
    fireThemeChange() {
        this._onThemeChange.fire(this._colorTheme);
    }
    get onDidColorThemeChange() {
        return this._onThemeChange.event;
    }
    getFileIconTheme() {
        return this._fileIconTheme;
    }
    get onDidFileIconThemeChange() {
        return this._onFileIconThemeChange.event;
    }
    getProductIconTheme() {
        return this._productIconTheme;
    }
    get onDidProductIconThemeChange() {
        return this._onProductIconThemeChange.event;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFRoZW1lU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RoZW1lL3Rlc3QvY29tbW9uL3Rlc3RUaGVtZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFTbkQsTUFBTSxPQUFPLGNBQWM7SUFHMUIsWUFDUyxTQUErQyxFQUFFLEVBQ2xELE9BQU8sV0FBVyxDQUFDLElBQUksRUFDZCx1QkFBdUIsS0FBSztRQUZwQyxXQUFNLEdBQU4sTUFBTSxDQUEyQztRQUNsRCxTQUFJLEdBQUosSUFBSSxDQUFtQjtRQUNkLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBUTtRQUw3QixVQUFLLEdBQUcsTUFBTSxDQUFBO0lBTTNCLENBQUM7SUFFSixRQUFRLENBQUMsS0FBYSxFQUFFLFVBQW9CO1FBQzNDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDaEMsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM1QixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELE9BQU8sQ0FBQyxLQUFhO1FBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQscUJBQXFCLENBQ3BCLElBQVksRUFDWixTQUFtQixFQUNuQixhQUFxQjtRQUVyQixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztDQUNEO0FBRUQsTUFBTSxpQkFBaUI7SUFBdkI7UUFDQyxpQkFBWSxHQUFHLEtBQUssQ0FBQTtRQUNwQixtQkFBYyxHQUFHLEtBQUssQ0FBQTtRQUN0Qix3QkFBbUIsR0FBRyxLQUFLLENBQUE7SUFDNUIsQ0FBQztDQUFBO0FBRUQsTUFBTSx3QkFBd0I7SUFDN0IsT0FBTyxDQUFDLFlBQThCO1FBQ3JDLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxnQkFBZ0I7SUFTNUIsWUFDQyxLQUFLLEdBQUcsSUFBSSxjQUFjLEVBQUUsRUFDNUIsYUFBYSxHQUFHLElBQUksaUJBQWlCLEVBQUUsRUFDdkMsZ0JBQWdCLEdBQUcsSUFBSSx3QkFBd0IsRUFBRTtRQVBsRCxtQkFBYyxHQUFHLElBQUksT0FBTyxFQUFlLENBQUE7UUFDM0MsMkJBQXNCLEdBQUcsSUFBSSxPQUFPLEVBQWtCLENBQUE7UUFDdEQsOEJBQXlCLEdBQUcsSUFBSSxPQUFPLEVBQXFCLENBQUE7UUFPM0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUE7UUFDeEIsSUFBSSxDQUFDLGNBQWMsR0FBRyxhQUFhLENBQUE7UUFDbkMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGdCQUFnQixDQUFBO0lBQzFDLENBQUM7SUFFRCxhQUFhO1FBQ1osT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQ3hCLENBQUM7SUFFRCxRQUFRLENBQUMsS0FBa0I7UUFDMUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUE7UUFDeEIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO0lBQ3ZCLENBQUM7SUFFRCxlQUFlO1FBQ2QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxJQUFXLHFCQUFxQjtRQUMvQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxnQkFBZ0I7UUFDZixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDM0IsQ0FBQztJQUVELElBQVcsd0JBQXdCO1FBQ2xDLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQTtJQUN6QyxDQUFDO0lBRUQsbUJBQW1CO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO0lBQzlCLENBQUM7SUFFRCxJQUFXLDJCQUEyQjtRQUNyQyxPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUE7SUFDNUMsQ0FBQztDQUNEIn0=
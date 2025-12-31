/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
export class ColorPickerModel {
    get color() {
        return this._color;
    }
    set color(color) {
        if (this._color.equals(color)) {
            return;
        }
        this._color = color;
        this._onDidChangeColor.fire(color);
    }
    get presentation() {
        return this.colorPresentations[this.presentationIndex];
    }
    get colorPresentations() {
        return this._colorPresentations;
    }
    set colorPresentations(colorPresentations) {
        this._colorPresentations = colorPresentations;
        if (this.presentationIndex > colorPresentations.length - 1) {
            this.presentationIndex = 0;
        }
        this._onDidChangePresentation.fire(this.presentation);
    }
    constructor(color, availableColorPresentations, presentationIndex) {
        this.presentationIndex = presentationIndex;
        this._onColorFlushed = new Emitter();
        this.onColorFlushed = this._onColorFlushed.event;
        this._onDidChangeColor = new Emitter();
        this.onDidChangeColor = this._onDidChangeColor.event;
        this._onDidChangePresentation = new Emitter();
        this.onDidChangePresentation = this._onDidChangePresentation.event;
        this.originalColor = color;
        this._color = color;
        this._colorPresentations = availableColorPresentations;
    }
    selectNextColorPresentation() {
        this.presentationIndex = (this.presentationIndex + 1) % this.colorPresentations.length;
        this.flushColor();
        this._onDidChangePresentation.fire(this.presentation);
    }
    guessColorPresentation(color, originalText) {
        let presentationIndex = -1;
        for (let i = 0; i < this.colorPresentations.length; i++) {
            if (originalText.toLowerCase() === this.colorPresentations[i].label) {
                presentationIndex = i;
                break;
            }
        }
        if (presentationIndex === -1) {
            // check which color presentation text has same prefix as original text's prefix
            const originalTextPrefix = originalText.split('(')[0].toLowerCase();
            for (let i = 0; i < this.colorPresentations.length; i++) {
                if (this.colorPresentations[i].label.toLowerCase().startsWith(originalTextPrefix)) {
                    presentationIndex = i;
                    break;
                }
            }
        }
        if (presentationIndex !== -1 && presentationIndex !== this.presentationIndex) {
            this.presentationIndex = presentationIndex;
            this._onDidChangePresentation.fire(this.presentation);
        }
    }
    flushColor() {
        this._onColorFlushed.fire(this._color);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JQaWNrZXJNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbG9yUGlja2VyL2Jyb3dzZXIvY29sb3JQaWNrZXJNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFHakUsTUFBTSxPQUFPLGdCQUFnQjtJQUk1QixJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztJQUVELElBQUksS0FBSyxDQUFDLEtBQVk7UUFDckIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQy9CLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDbkIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUlELElBQUksa0JBQWtCO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFBO0lBQ2hDLENBQUM7SUFFRCxJQUFJLGtCQUFrQixDQUFDLGtCQUF3QztRQUM5RCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsa0JBQWtCLENBQUE7UUFDN0MsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsa0JBQWtCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzVELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLENBQUE7UUFDM0IsQ0FBQztRQUNELElBQUksQ0FBQyx3QkFBd0IsQ0FB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
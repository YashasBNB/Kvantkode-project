/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class FastDomNode {
    constructor(domNode) {
        this.domNode = domNode;
        this._maxWidth = '';
        this._width = '';
        this._height = '';
        this._top = '';
        this._left = '';
        this._bottom = '';
        this._right = '';
        this._paddingTop = '';
        this._paddingLeft = '';
        this._paddingBottom = '';
        this._paddingRight = '';
        this._fontFamily = '';
        this._fontWeight = '';
        this._fontSize = '';
        this._fontStyle = '';
        this._fontFeatureSettings = '';
        this._fontVariationSettings = '';
        this._textDecoration = '';
        this._lineHeight = '';
        this._letterSpacing = '';
        this._className = '';
        this._display = '';
        this._position = '';
        this._visibility = '';
        this._color = '';
        this._backgroundColor = '';
        this._layerHint = false;
        this._contain = 'none';
        this._boxShadow = '';
    }
    focus() {
        this.domNode.focus();
    }
    setMaxWidth(_maxWidth) {
        const maxWidth = numberAsPixels(_maxWidth);
        if (this._maxWidth === maxWidth) {
            return;
        }
        this._maxWidth = maxWidth;
        this.domNode.style.maxWidth = this._maxWidth;
    }
    setWidth(_width) {
        const width = numberAsPixels(_width);
        if (this._width === width) {
            return;
        }
        this._width = width;
        this.domNode.style.width = this._width;
    }
    setHeight(_height) {
        const height = numberAsPixels(_height);
        if (this._height === height) {
            return;
        }
        this._height = height;
        this.domNode.style.height = this._height;
    }
    setTop(_top) {
        const top = numberAsPixels(_top);
        if (this._top === top) {
            return;
        }
        this._top = top;
        this.domNode.style.top = this._top;
    }
    setLeft(_left) {
        const left = numberAsPixels(_left);
        if (this._left === left) {
            return;
        }
        this._left = left;
        this.domNode.style.left = this._left;
    }
    setBottom(_bottom) {
        const bottom = numberAsPixels(_bottom);
        if (this._bottom === bottom) {
            return;
        }
        this._bottom = bottom;
        this.domNode.style.bottom = this._bottom;
    }
    setRight(_right) {
        const right = numberAsPixels(_right);
        if (this._right === right) {
            return;
        }
        this._right = right;
        this.domNode.style.right = this._right;
    }
    setPaddingTop(_paddingTop) {
        const paddingTop = numberAsPixels(_paddingTop);
        if (this._paddingTop === paddingTop) {
            return;
        }
        this._paddingTop = paddingTop;
        this.domNode.style.paddingTop = this._paddingTop;
    }
    setPaddingLeft(_paddingLeft) {
        const paddingLeft = numberAsPixels(_paddingLeft);
        if (this._paddingLeft === paddingLeft) {
            return;
        }
        this._paddingLeft = paddingLeft;
        this.domNode.style.paddingLeft = this._paddingLeft;
    }
    setPaddingBottom(_paddingBottom) {
        const paddingBottom = numberAsPixels(_paddingBottom);
        if (this._paddingBottom === paddingBottom) {
            return;
        }
        this._paddingBottom = paddingBottom;
        this.domNode.style.paddingBottom = this._paddingBottom;
    }
    setPaddingRight(_paddingRight) {
        const paddingRight = numberAsPixels(_paddingRight);
        if (this._paddingRight === paddingRight) {
            return;
        }
        this._paddingRight = paddingRight;
        this.domNode.style.paddingRight = this._paddingRight;
    }
    setFontFamily(fontFamily) {
        if (this._fontFamily === fontFamily) {
            return;
        }
        this._fontFamily = fontFamily;
        this.domNode.style.fontFamily = this._fontFamily;
    }
    setFontWeight(fontWeight) {
        if (this._fontWeight === fontWeight) {
            return;
        }
        this._fontWeight = fontWeight;
        this.domNode.style.fontWeight = this._fontWeight;
    }
    setFontSize(_fontSize) {
        const fontSize = numberAsPixels(_fontSize);
        if (this._fontSize === fontSize) {
            return;
        }
        this._fontSize = fontSize;
        this.domNode.style.fontSize = this._fontSize;
    }
    setFontStyle(fontStyle) {
        if (this._fontStyle === fontStyle) {
            return;
        }
        this._fontStyle = fontStyle;
        this.domNode.style.fontStyle = this._fontStyle;
    }
    setFontFeatureSettings(fontFeatureSettings) {
        if (this._fontFeatureSettings === fontFeatureSettings) {
            return;
        }
        this._fontFeatureSettings = fontFeatureSettings;
        this.domNode.style.fontFeatureSettings = this._fontFeatureSettings;
    }
    setFontVariationSettings(fontVariationSettings) {
        if (this._fontVariationSettings === fontVariationSettings) {
            return;
        }
        this._fontVariationSettings = fontVariationSettings;
        this.domNode.style.fontVariationSettings = this._fontVariationSettings;
    }
    setTextDecoration(textDecoration) {
        if (this._textDecoration === textDecoration) {
            return;
        }
        this._textDecoration = textDecoration;
        this.domNode.style.textDecoration = this._textDecoration;
    }
    setLineHeight(_lineHeight) {
        const lineHeight = numberAsPixels(_lineHeight);
        if (this._lineHeight === lineHeight) {
            return;
        }
        this._lineHeight = lineHeight;
        this.domNode.style.lineHeight = this._lineHeight;
    }
    setLetterSpacing(_letterSpacing) {
        const letterSpacing = numberAsPixels(_letterSpacing);
        if (this._letterSpacing === letterSpacing) {
            return;
        }
        this._letterSpacing = letterSpacing;
        this.domNode.style.letterSpacing = this._letterSpacing;
    }
    setClassName(className) {
        if (this._className === className) {
            return;
        }
        this._className = className;
        this.domNode.className = this._className;
    }
    toggleClassName(className, shouldHaveIt) {
        this.domNode.classList.toggle(className, shouldHaveIt);
        this._className = this.domNode.className;
    }
    setDisplay(display) {
        if (this._display === display) {
            return;
        }
        this._display = display;
        this.domNode.style.display = this._display;
    }
    setPosition(position) {
        if (this._position === position) {
            return;
        }
        this._position = position;
        this.domNode.style.position = this._position;
    }
    setVisibility(visibility) {
        if (this._visibility === visibility) {
            return;
        }
        this._visibility = visibility;
        this.domNode.style.visibility = this._visibility;
    }
    setColor(color) {
        if (this._color === color) {
            return;
        }
        this._color = color;
        this.domNode.style.color = this._color;
    }
    setBackgroundColor(backgroundColor) {
        if (this._backgroundColor === backgroundColor) {
            return;
        }
        this._backgroundColor = backgroundColor;
        this.domNode.style.backgroundColor = this._backgroundColor;
    }
    setLayerHinting(layerHint) {
        if (this._layerHint === layerHint) {
            return;
        }
        this._layerHint = layerHint;
        this.domNode.style.transform = this._layerHint ? 'translate3d(0px, 0px, 0px)' : '';
    }
    setBoxShadow(boxShadow) {
        if (this._boxShadow === boxShadow) {
            return;
        }
        this._boxShadow = boxShadow;
        this.domNode.style.boxShadow = boxShadow;
    }
    setContain(contain) {
        if (this._contain === contain) {
            return;
        }
        this._contain = contain;
        this.domNode.style.contain = this._contain;
    }
    setAttribute(name, value) {
        this.domNode.setAttribute(name, value);
    }
    removeAttribute(name) {
        this.domNode.removeAttribute(name);
    }
    appendChild(child) {
        this.domNode.appendChild(child.domNode);
    }
    removeChild(child) {
        this.domNode.removeChild(child.domNode);
    }
}
function numberAsPixels(value) {
    return typeof value === 'number' ? `${value}px` : value;
}
export function createFastDomNode(domNode) {
    return new FastDomNode(domNode);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFzdERvbU5vZGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvZmFzdERvbU5vZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsTUFBTSxPQUFPLFdBQVc7SUErQnZCLFlBQTRCLE9BQVU7UUFBVixZQUFPLEdBQVAsT0FBTyxDQUFHO1FBOUI5QixjQUFTLEdBQVcsRUFBRSxDQUFBO1FBQ3RCLFdBQU0sR0FBVyxFQUFFLENBQUE7UUFDbkIsWUFBTyxHQUFXLEVBQUUsQ0FBQTtRQUNwQixTQUFJLEdBQVcsRUFBRSxDQUFBO1FBQ2pCLFVBQUssR0FBVyxFQUFFLENBQUE7UUFDbEIsWUFBTyxHQUFXLEVBQUUsQ0FBQTtRQUNwQixXQUFNLEdBQVcsRUFBRSxDQUFBO1FBQ25CLGdCQUFXLEdBQVcsRUFBRSxDQUFBO1FBQ3hCLGlCQUFZLEdBQVcsRUFBRSxDQUFBO1FBQ3pCLG1CQUFjLEdBQVcsRUFBRSxDQUFBO1FBQzNCLGtCQUFhLEdBQVcsRUFBRSxDQUFBO1FBQzFCLGdCQUFXLEdBQVcsRUFBRSxDQUFBO1FBQ3hCLGdCQUFXLEdBQVcsRUFBRSxDQUFBO1FBQ3hCLGNBQVMsR0FBVyxFQUFFLENBQUE7UUFDdEIsZUFBVSxHQUFXLEVBQUUsQ0FBQTtRQUN2Qix5QkFBb0IsR0FBVyxFQUFFLENBQUE7UUFDakMsMkJBQXNCLEdBQVcsRUFBRSxDQUFBO1FBQ25DLG9CQUFlLEdBQVcsRUFBRSxDQUFBO1FBQzVCLGdCQUFXLEdBQVcsRUFBRSxDQUFBO1FBQ3hCLG1CQUFjLEdBQVcsRUFBRSxDQUFBO1FBQzNCLGVBQVUsR0FBVyxFQUFFLENBQUE7UUFDdkIsYUFBUSxHQUFXLEVBQUUsQ0FBQTtRQUNyQixjQUFTLEdBQVcsRUFBRSxDQUFBO1FBQ3RCLGdCQUFXLEdBQVcsRUFBRSxDQUFBO1FBQ3hCLFdBQU0sR0FBVyxF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
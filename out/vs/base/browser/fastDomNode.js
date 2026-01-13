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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFzdERvbU5vZGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9mYXN0RG9tTm9kZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxNQUFNLE9BQU8sV0FBVztJQStCdkIsWUFBNEIsT0FBVTtRQUFWLFlBQU8sR0FBUCxPQUFPLENBQUc7UUE5QjlCLGNBQVMsR0FBVyxFQUFFLENBQUE7UUFDdEIsV0FBTSxHQUFXLEVBQUUsQ0FBQTtRQUNuQixZQUFPLEdBQVcsRUFBRSxDQUFBO1FBQ3BCLFNBQUksR0FBVyxFQUFFLENBQUE7UUFDakIsVUFBSyxHQUFXLEVBQUUsQ0FBQTtRQUNsQixZQUFPLEdBQVcsRUFBRSxDQUFBO1FBQ3BCLFdBQU0sR0FBVyxFQUFFLENBQUE7UUFDbkIsZ0JBQVcsR0FBVyxFQUFFLENBQUE7UUFDeEIsaUJBQVksR0FBVyxFQUFFLENBQUE7UUFDekIsbUJBQWMsR0FBVyxFQUFFLENBQUE7UUFDM0Isa0JBQWEsR0FBVyxFQUFFLENBQUE7UUFDMUIsZ0JBQVcsR0FBVyxFQUFFLENBQUE7UUFDeEIsZ0JBQVcsR0FBVyxFQUFFLENBQUE7UUFDeEIsY0FBUyxHQUFXLEVBQUUsQ0FBQTtRQUN0QixlQUFVLEdBQVcsRUFBRSxDQUFBO1FBQ3ZCLHlCQUFvQixHQUFXLEVBQUUsQ0FBQTtRQUNqQywyQkFBc0IsR0FBVyxFQUFFLENBQUE7UUFDbkMsb0JBQWUsR0FBVyxFQUFFLENBQUE7UUFDNUIsZ0JBQVcsR0FBVyxFQUFFLENBQUE7UUFDeEIsbUJBQWMsR0FBVyxFQUFFLENBQUE7UUFDM0IsZUFBVSxHQUFXLEVBQUUsQ0FBQTtRQUN2QixhQUFRLEdBQVcsRUFBRSxDQUFBO1FBQ3JCLGNBQVMsR0FBVyxFQUFFLENBQUE7UUFDdEIsZ0JBQVcsR0FBVyxFQUFF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
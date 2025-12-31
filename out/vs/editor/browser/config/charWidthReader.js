/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { applyFontInfo } from './domFontInfo.js';
export var CharWidthRequestType;
(function (CharWidthRequestType) {
    CharWidthRequestType[CharWidthRequestType["Regular"] = 0] = "Regular";
    CharWidthRequestType[CharWidthRequestType["Italic"] = 1] = "Italic";
    CharWidthRequestType[CharWidthRequestType["Bold"] = 2] = "Bold";
})(CharWidthRequestType || (CharWidthRequestType = {}));
export class CharWidthRequest {
    constructor(chr, type) {
        this.chr = chr;
        this.type = type;
        this.width = 0;
    }
    fulfill(width) {
        this.width = width;
    }
}
class DomCharWidthReader {
    constructor(bareFontInfo, requests) {
        this._bareFontInfo = bareFontInfo;
        this._requests = requests;
        this._container = null;
        this._testElements = null;
    }
    read(targetWindow) {
        // Create a test container with all these test elements
        this._createDomElements();
        // Add the container to the DOM
        targetWindow.document.body.appendChild(this._container);
        // Read character widths
        this._readFromDomElements();
        // Remove the container from the DOM
        this._container?.remove();
        this._container = null;
        this._testElements = null;
    }
    _createDomElements() {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '-50000px';
        container.style.width = '50000px';
        const regularDomNode = document.createElement('div');
        applyFontInfo(regularDomNode, this._bareFontInfo);
        container.appendChild(regularDomNode);
        const boldDomNode = document.createElement('div');
        applyFontInfo(boldDomNode, this._bareFontInfo);
        boldDomNode.style.fontWeight = 'bold';
        container.appendChild(boldDomNode);
        const italicDomNode = document.createElement('div');
        applyFontInfo(italicDomNode, this._bareFontInfo);
        italicDomNode.style.fontStyle = 'italic';
        container.appendChild(italicDomNode);
        const testElements = [];
        for (const request of this._requests) {
            let parent;
            if (request.type === 0 /* CharWidthRequestType.Regular */) {
                parent = regularDomNode;
            }
            if (request.type === 2 /* CharWidthRequestType.Bold */) {
                parent = boldDomNode;
            }
            if (request.type === 1 /* CharWidthRequestType.Italic */) {
                parent = italicDomNode;
            }
            parent.appendChild(document.createElement('br'));
            const testElement = document.createElement('span');
            DomCharWidthReader._render(testElement, request);
            parent.appendChild(testElement);
            testElements.push(testElement);
        }
        this._container = container;
        this._testElements = testElements;
    }
    static _render(testElement, request) {
        if (request.chr === ' ') {
            let htmlString = '\u00a0';
            // Repeat character 256 (2^8) times
            for (let i = 0; i < 8; i++) {
                htmlString += htmlString;
            }
            testElement.innerText = htmlString;
        }
        else {
            let testString = request.chr;
            // Repeat character 256 (2^8) times
            for (let i = 0; i < 8; i++) {
                testString += testString;
            }
            testElement.textContent = testString;
        }
    }
    _readFromDomElements() {
        for (let i = 0, len = this._requests.length; i < len; i++) {
            const request = this._requests[i];
            const testElement = this._testElements[i];
            request.fulfill(testElement.offsetWidth / 256);
        }
    }
}
export function readCharWidths(targetWindow, bareFontInfo, requests) {
    const reader = new DomCharWidthReader(bareFontInfo, requests);
    reader.read(targetWindow);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcldpZHRoUmVhZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvY29uZmlnL2NoYXJXaWR0aFJlYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFHaEQsTUFBTSxDQUFOLElBQWtCLG9CQUlqQjtBQUpELFdBQWtCLG9CQUFvQjtJQUNyQyxxRUFBVyxDQUFBO0lBQ1gsbUVBQVUsQ0FBQTtJQUNWLCtEQUFRLENBQUE7QUFDVCxDQUFDLEVBSmlCLG9CQUFvQixLQUFwQixvQkFBb0IsUUFJckM7QUFFRCxNQUFNLE9BQU8sZ0JBQWdCO0lBSzVCLFlBQVksR0FBVyxFQUFFLElBQTBCO1FBQ2xELElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFBO1FBQ2QsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7UUFDaEIsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUE7SUFDZixDQUFDO0lBRU0sT0FBTyxDQUFDLEtBQWE7UUFDM0IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7SUFDbkIsQ0FBQztDQUNEO0FBRUQsTUFBTSxrQkFBa0I7SUFPdkIsWUFBWSxZQUEwQixFQUFFLFFBQTRCO1FBQ25FLElBQUksQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFBO1FBQ2pDLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFBO1FBRXpCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFBO1FBQ3RCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFBO0lBQzFCLENBQUM7SUFFTSxJQUFJLENBQUMsWUFBb0I7UUFDL0IsdURBQXVEO1FBQ3ZELElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO1FBRXpCLCtCQUErQjtRQUMv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
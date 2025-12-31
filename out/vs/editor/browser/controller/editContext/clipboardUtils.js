import { isWindows } from '../../../../base/common/platform.js';
import { Mimes } from '../../../../base/common/mime.js';
export function getDataToCopy(viewModel, modelSelections, emptySelectionClipboard, copyWithSyntaxHighlighting) {
    const rawTextToCopy = viewModel.getPlainTextToCopy(modelSelections, emptySelectionClipboard, isWindows);
    const newLineCharacter = viewModel.model.getEOL();
    const isFromEmptySelection = emptySelectionClipboard && modelSelections.length === 1 && modelSelections[0].isEmpty();
    const multicursorText = Array.isArray(rawTextToCopy) ? rawTextToCopy : null;
    const text = Array.isArray(rawTextToCopy) ? rawTextToCopy.join(newLineCharacter) : rawTextToCopy;
    let html = undefined;
    let mode = null;
    if (CopyOptions.forceCopyWithSyntaxHighlighting ||
        (copyWithSyntaxHighlighting && text.length < 65536)) {
        const richText = viewModel.getRichTextToCopy(modelSelections, emptySelectionClipboard);
        if (richText) {
            html = richText.html;
            mode = richText.mode;
        }
    }
    const dataToCopy = {
        isFromEmptySelection,
        multicursorText,
        text,
        html,
        mode,
    };
    return dataToCopy;
}
/**
 * Every time we write to the clipboard, we record a bit of extra metadata here.
 * Every time we read from the cipboard, if the text matches our last written text,
 * we can fetch the previous metadata.
 */
export class InMemoryClipboardMetadataManager {
    static { this.INSTANCE = new InMemoryClipboardMetadataManager(); }
    constructor() {
        this._lastState = null;
    }
    set(lastCopiedValue, data) {
        this._lastState = { lastCopiedValue, data };
    }
    get(pastedText) {
        if (this._lastState && this._lastState.lastCopiedValue === pastedText) {
            // match!
            return this._lastState.data;
        }
        this._lastState = null;
        return null;
    }
}
export const CopyOptions = {
    forceCopyWithSyntaxHighlighting: false,
};
export const ClipboardEventUtils = {
    getTextData(clipboardData) {
        const text = clipboardData.getData(Mimes.text);
        let metadata = null;
        const rawmetadata = clipboardData.getData('vscode-editor-data');
        if (typeof rawmetadata === 'string') {
            try {
                metadata = JSON.parse(rawmetadata);
                if (metadata.version !== 1) {
                    metadata = null;
                }
            }
            catch (err) {
                // no problem!
            }
        }
        if (text.length === 0 && metadata === null && clipboardData.files.length > 0) {
            // no textual data pasted, generate text from file names
            const files = Array.prototype.slice.call(clipboardData.files, 0);
            return [files.map((file) => file.name).join('\n'), null];
        }
        return [text, metadata];
    },
    setTextData(clipboardData, text, html, metadata) {
        clipboardData.setData(Mimes.text, text);
        if (typeof html === 'string') {
            clipboardData.setData('text/html', html);
        }
        clipboardData.setData('vscode-editor-data', JSON.stringify(metadata));
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpcGJvYXJkVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9jb250cm9sbGVyL2VkaXRDb250ZXh0L2NsaXBib2FyZFV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU1BLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFdkQsTUFBTSxVQUFVLGFBQWEsQ0FDNUIsU0FBcUIsRUFDckIsZUFBd0IsRUFDeEIsdUJBQWdDLEVBQ2hDLDBCQUFtQztJQUVuQyxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsa0JBQWtCLENBQ2pELGVBQWUsRUFDZix1QkFBdUIsRUFDdkIsU0FBUyxDQUNULENBQUE7SUFDRCxNQUFNLGdCQUFnQixHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUE7SUFFakQsTUFBTSxvQkFBb0IsR0FDekIsdUJBQXVCLElBQUksZUFBZSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3hGLE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0lBQzNFLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFBO0lBRWhHLElBQUksSUFBSSxHQUE4QixTQUFTLENBQUE7SUFDL0MsSUFBSSxJQUFJLEdBQWtCLElBQUksQ0FBQTtJQUM5QixJQUNDLFdBQVcsQ0FB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
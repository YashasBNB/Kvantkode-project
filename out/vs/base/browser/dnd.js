/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { addDisposableListener } from './dom.js';
import { Disposable } from '../common/lifecycle.js';
import { Mimes } from '../common/mime.js';
/**
 * A helper that will execute a provided function when the provided HTMLElement receives
 *  dragover event for 800ms. If the drag is aborted before, the callback will not be triggered.
 */
export class DelayedDragHandler extends Disposable {
    constructor(container, callback) {
        super();
        this._register(addDisposableListener(container, 'dragover', (e) => {
            e.preventDefault(); // needed so that the drop event fires (https://stackoverflow.com/questions/21339924/drop-event-not-firing-in-chrome)
            if (!this.timeout) {
                this.timeout = setTimeout(() => {
                    callback();
                    this.timeout = null;
                }, 800);
            }
        }));
        ['dragleave', 'drop', 'dragend'].forEach((type) => {
            this._register(addDisposableListener(container, type, () => {
                this.clearDragTimeout();
            }));
        });
    }
    clearDragTimeout() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }
    dispose() {
        super.dispose();
        this.clearDragTimeout();
    }
}
// Common data transfers
export const DataTransfers = {
    /**
     * Application specific resource transfer type
     */
    RESOURCES: 'ResourceURLs',
    /**
     * Browser specific transfer type to download
     */
    DOWNLOAD_URL: 'DownloadURL',
    /**
     * Browser specific transfer type for files
     */
    FILES: 'Files',
    /**
     * Typically transfer type for copy/paste transfers.
     */
    TEXT: Mimes.text,
    /**
     * Internal type used to pass around text/uri-list data.
     *
     * This is needed to work around https://bugs.chromium.org/p/chromium/issues/detail?id=239745.
     */
    INTERNAL_URI_LIST: 'application/vnd.code.uri-list',
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL2RuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxVQUFVLENBQUE7QUFDaEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUV6Qzs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsVUFBVTtJQUdqRCxZQUFZLFNBQXNCLEVBQUUsUUFBb0I7UUFDdkQsS0FBSyxFQUFFLENBQUE7UUFFUCxJQUFJLENBQUMsU0FBUyxDQUNiLHFCQUFxQixDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNsRCxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUEsQ0FBQyxxSEFBcUg7WUFFeEksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDbkIsSUFBSSxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFO29CQUM5QixRQUFRLEVBQUUsQ0FBQTtvQkFFVixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQTtnQkFDcEIsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ1IsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBRUE7UUFBQSxDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDbEQsSUFBSSxDQUFDLFNBQVMsQ0FDYixxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRTtnQkFDM0MsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUE7WUFDeEIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLGdCQUFnQjtRQUN2QixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQzFCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFBO1FBQ3BCLENBQUM7SUFDRixDQUFDO0lBRVEsT0FBTztRQUNmLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUVmLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO0lBQ3hCLENBQUM7Q0FDRDtBQUVELHdCQUF3QjtBQUN4QixNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUc7SUFDNUI7O09BRUc7SUFDSCxTQUFTLEVBQUUsY0FBYztJQUV6Qjs7T0FFRztJQUNILFlBQVksRUFBRSxhQUFhO0lBRTNCOztPQUVHO0lBQ0gsS0FBSyxFQUFFLE9BQU87SUFFZDs7T0FFRztJQUNILElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtJQUVoQjs7OztPQUlHO0lBQ0gsaUJBQWlCLEVBQUUsK0JBQStCO0NBQ2xELENBQUEifQ==
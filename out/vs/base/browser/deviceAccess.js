/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export async function requestUsbDevice(options) {
    const usb = navigator.usb;
    if (!usb) {
        return undefined;
    }
    const device = await usb.requestDevice({ filters: options?.filters ?? [] });
    if (!device) {
        return undefined;
    }
    return {
        deviceClass: device.deviceClass,
        deviceProtocol: device.deviceProtocol,
        deviceSubclass: device.deviceSubclass,
        deviceVersionMajor: device.deviceVersionMajor,
        deviceVersionMinor: device.deviceVersionMinor,
        deviceVersionSubminor: device.deviceVersionSubminor,
        manufacturerName: device.manufacturerName,
        productId: device.productId,
        productName: device.productName,
        serialNumber: device.serialNumber,
        usbVersionMajor: device.usbVersionMajor,
        usbVersionMinor: device.usbVersionMinor,
        usbVersionSubminor: device.usbVersionSubminor,
        vendorId: device.vendorId,
    };
}
export async function requestSerialPort(options) {
    const serial = navigator.serial;
    if (!serial) {
        return undefined;
    }
    const port = await serial.requestPort({ filters: options?.filters ?? [] });
    if (!port) {
        return undefined;
    }
    const info = port.getInfo();
    return {
        usbVendorId: info.usbVendorId,
        usbProductId: info.usbProductId,
    };
}
export async function requestHidDevice(options) {
    const hid = navigator.hid;
    if (!hid) {
        return undefined;
    }
    const devices = await hid.requestDevice({ filters: options?.filters ?? [] });
    if (!devices.length) {
        return undefined;
    }
    const device = devices[0];
    return {
        opened: device.opened,
        vendorId: device.vendorId,
        productId: device.productId,
        productName: device.productName,
        collections: device.collections,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2aWNlQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL2RldmljZUFjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQXFCaEcsTUFBTSxDQUFDLEtBQUssVUFBVSxnQkFBZ0IsQ0FBQyxPQUV0QztJQUNBLE1BQU0sR0FBRyxHQUFJLFNBQWlCLENBQUMsR0FBRyxDQUFBO0lBQ2xDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNWLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLEdBQUcsQ0FBQyxhQUFhLENBQUMsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQzNFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNiLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxPQUFPO1FBQ04sV0FBVyxFQUFFLE1BQU0sQ0FBQyxXQUFXO1FBQy9CLGNBQWMsRUFBRSxNQUFNLENBQUMsY0FBYztRQUNyQyxjQUFjLEVBQUUsTUFBTSxDQUFDLGNBQWM7UUFDckMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtRQUM3QyxrQkFBa0IsRUFBRSxNQUFNLENBQUMsa0JBQWtCO1FBQzdDLHFCQUFxQixFQUFFLE1BQU0sQ0FBQyxxQkFBcUI7UUFDbkQsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtRQUN6QyxTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVM7UUFDM0IsV0FBVyxFQUFFLE1BQU0sQ0FBQyxXQUFXO1FBQy9CLFlBQVksRUFBRSxNQUFNLENBQUMsWUFBWTtRQUNqQyxlQUFlLEVBQUUsTUFBTSxDQUFDLGVBQWU7UUFDdkMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxlQUFlO1FBQ3ZDLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxrQkFBa0I7UUFDN0MsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRO0tBQ3pCLENBQUE7QUFDRixDQUFDO0FBU0QsTUFBTSxDQUFDLEtBQUssVUFBVSxpQkFBaUIsQ0FBQyxPQUV2QztJQUNBLE1BQU0sTUFBTSxHQUFJLFNBQWlCLENBQUMsTUFBTSxDQUFBO0lBQ3hDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNiLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQzFFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNYLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDM0IsT0FBTztRQUNOLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztRQUM3QixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7S0FDL0IsQ0FBQTtBQUNGLENBQUM7QUFZRCxNQUFNLENBQUMsS0FBSyxVQUFVLGdCQUFnQixDQUFDLE9BRXRDO0lBQ0EsTUFBTSxHQUFHLEdBQUksU0FBaUIsQ0FBQyxHQUFHLENBQUE7SUFDbEMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ1YsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFHLE1BQU0sR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDNUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNyQixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3pCLE9BQU87UUFDTixNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU07UUFDckIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRO1FBQ3pCLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUztRQUMzQixXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVc7UUFDL0IsV0FBVyxFQUFFLE1BQU0sQ0FBQyxXQUFXO0tBQy9CLENBQUE7QUFDRixDQUFDIn0=
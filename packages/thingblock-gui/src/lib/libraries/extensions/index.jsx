import React from 'react';
import {FormattedMessage} from 'react-intl';

import thingbotTelemetrixIconURL from './thingbotTelemetrix/thingbot-telemetrix.svg';
import thingbotTelemetrixInsetIconURL from './thingbotTelemetrix/thingbot-telemetrix-small.svg';
import cameraAiIconURL from './cameraAi/camera-ai.svg';
import cameraAiInsetIconURL from './cameraAi/camera-ai-small.svg';
import thingEdgesIconURL from './thingEdges/thingedges.svg';
import thingEdgesInsetIconURL from './thingEdges/thingedges-small.svg';

export default [
    {
        name: 'Camera AI',
        extensionId: 'cameraAi',
        iconURL: cameraAiIconURL,
        insetIconURL: cameraAiInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="See hands and gestures through the webcam; play games on the playground."
                description="Description for the Camera AI extension"
                id="gui.extension.cameraAi.description"
            />
        ),
        featured: true
    },
    {
        name: 'ThingBot Telemetrix',
        extensionId: 'thingbotTelemetrix',
        iconURL: thingbotTelemetrixIconURL,
        insetIconURL: thingbotTelemetrixInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Control Arduino & ESP32 boards."
                description="Description for the ThingBot Telemetrix extension"
                id="gui.extension.thingbotTelemetrix.description"
            />
        ),
        featured: true,
        // Helper backend streams multiple named devices, so let the user pick from a
        // list (ScanningStep). The Web Bluetooth backend has no such list — its native
        // OS chooser is treated as an external list and forces AutoScanningStep instead;
        // see the connection-modal container's dynamic useExternalPeripheralList.
        useAutoScan: false,
        connectionSmallIconURL: thingbotTelemetrixInsetIconURL,
        // Live-mode firmware image in the ThingBot device pack, installed from the connection modal.
        firmware: {deviceId: 'thingbot', firmwareId: 'telemetrix-ble'},
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message shown while connecting to ThingBot"
                id="gui.extension.thingbotTelemetrix.connectingMessage"
            />
        ),
        prescanMessage: (
            <FormattedMessage
                defaultMessage="Make sure your ThingBot is powered on and nearby."
                description="ThingBot pre-scan instruction"
                id="gui.extension.thingbotTelemetrix.prescanMessage"
            />
        ),
        scanBeginMessage: (
            <FormattedMessage
                defaultMessage="Select your ThingBot from the list."
                description="ThingBot scan begin instruction"
                id="gui.extension.thingbotTelemetrix.scanBeginMessage"
            />
        )
    },
    {
        name: 'ThingEdges',
        extensionId: 'thingEdges',
        iconURL: thingEdgesIconURL,
        insetIconURL: thingEdgesInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Program the lights, switches and IR remotes of ThingEdges Desktop on this computer."
                description="Description for the ThingEdges extension"
                id="gui.extension.thingEdges.description"
            />
        ),
        featured: true
    }
];

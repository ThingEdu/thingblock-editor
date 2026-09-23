import React from 'react';
import {FormattedMessage} from 'react-intl';

import translateIconURL from './translate/translate.png';
import translateInsetIconURL from './translate/translate-small.png';

import thingbotTelemetrixIconURL from './thingbotTelemetrix/thingbot-telemetrix.svg';
import thingbotTelemetrixInsetIconURL from './thingbotTelemetrix/thingbot-telemetrix-small.svg';

export default [
    {
        name: (
            <FormattedMessage
                defaultMessage="Translate"
                description="Name for the Translate extension"
                id="gui.extension.translate.name"
            />
        ),
        extensionId: 'translate',
        collaborator: 'Google',
        iconURL: translateIconURL,
        insetIconURL: translateInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Translate text into many languages."
                description="Description for the Translate extension"
                id="gui.extension.translate.description"
            />
        ),
        featured: true,
        internetConnectionRequired: true
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
    }
];

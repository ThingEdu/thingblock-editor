import React from 'react';
import {FormattedMessage} from 'react-intl';

import musicIconURL from './music/music.png';
import musicInsetIconURL from './music/music-small.svg';

import penIconURL from './pen/pen.png';
import penInsetIconURL from './pen/pen-small.svg';

import text2speechIconURL from './text2speech/text2speech.png';
import text2speechInsetIconURL from './text2speech/text2speech-small.svg';

import translateIconURL from './translate/translate.png';
import translateInsetIconURL from './translate/translate-small.png';

import thingbotTelemetrixIconURL from './thingbotTelemetrix/thingbot-telemetrix.svg';
import thingbotTelemetrixInsetIconURL from './thingbotTelemetrix/thingbot-telemetrix-small.svg';

export default [
    {
        name: (
            <FormattedMessage
                defaultMessage="Music"
                description="Name for the 'Music' extension"
                id="gui.extension.music.name"
            />
        ),
        extensionId: 'music',
        iconURL: musicIconURL,
        insetIconURL: musicInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Play instruments and drums."
                description="Description for the 'Music' extension"
                id="gui.extension.music.description"
            />
        ),
        featured: true
    },
    {
        name: (
            <FormattedMessage
                defaultMessage="Pen"
                description="Name for the 'Pen' extension"
                id="gui.extension.pen.name"
            />
        ),
        extensionId: 'pen',
        iconURL: penIconURL,
        insetIconURL: penInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Draw with your sprites."
                description="Description for the 'Pen' extension"
                id="gui.extension.pen.description"
            />
        ),
        featured: true
    },
    {
        name: (
            <FormattedMessage
                defaultMessage="Text to Speech"
                description="Name for the Text to Speech extension"
                id="gui.extension.text2speech.name"
            />
        ),
        extensionId: 'text2speech',
        collaborator: 'Amazon Web Services',
        iconURL: text2speechIconURL,
        insetIconURL: text2speechInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Make your projects talk."
                description="Description for the Text to speech extension"
                id="gui.extension.text2speech.description"
            />
        ),
        featured: true,
        internetConnectionRequired: true
    },
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

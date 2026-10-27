import React from 'react';
import {FormattedMessage} from 'react-intl';

// Tutorial thumbnails: Avoid using any text that would need to be
// translated in thumbnails.
import libraryThingbotGettingStarted from './thumbnails/thingbot-getting-started.png';

export const CATEGORIES = {
    gettingStarted: 'gettingStarted',
    basics: 'basics',
    intermediate: 'intermediate',
    prompts: 'prompts'
};

export default {

    'thingbot-getting-started': {
        name: (
            <FormattedMessage
                defaultMessage="Getting Started with ThingBot"
                description="Name for the 'Getting Started with ThingBot' how-to"
                id="gui.howtos.thingbot-getting-started.name"
            />
        ),
        tags: ['thingbot', 'telemetrix', 'arduino', 'esp32', 'led', 'ultrasonic', 'bluetooth', 'robot'],
        category: CATEGORIES.gettingStarted,
        img: libraryThingbotGettingStarted,
        steps: [{
            title: (
                <FormattedMessage
                    defaultMessage="Power up your ThingBot"
                    description="Step name for 'Power up your ThingBot' step"
                    id="gui.howtos.thingbot-getting-started.step_powerOn"
                />
            ),
            image: 'thingbotPowerOn'
        }, {
            title: (
                <FormattedMessage
                    defaultMessage="Open the extension library"
                    description="Step name for 'Open the extension library' step"
                    id="gui.howtos.thingbot-getting-started.step_openExtensionLibrary"
                />
            ),
            image: 'thingbotOpenExtensionLibrary'
        }, {
            title: (
                <FormattedMessage
                    defaultMessage="Add the ThingBot Telemetrix extension"
                    description="Step name for 'Add the ThingBot Telemetrix extension' step"
                    id="gui.howtos.thingbot-getting-started.step_addExtension"
                />
            ),
            image: 'thingbotAddExtension'
        }, {
            title: (
                <FormattedMessage
                    defaultMessage="Connect over Bluetooth"
                    description="Step name for 'Connect over Bluetooth' step"
                    id="gui.howtos.thingbot-getting-started.step_connect"
                />
            ),
            image: 'thingbotConnect'
        }, {
            title: (
                <FormattedMessage
                    defaultMessage="Choose your board from the list"
                    description="Step name for 'Choose your board from the list' step"
                    id="gui.howtos.thingbot-getting-started.step_chooseDevice"
                />
            ),
            image: 'thingbotChooseDevice'
        }, {
            title: (
                <FormattedMessage
                    defaultMessage="Turn on the built-in LED"
                    description="Step name for 'Turn on the built-in LED' step"
                    id="gui.howtos.thingbot-getting-started.step_ledOn"
                />
            ),
            image: 'thingbotLedOn'
        }, {
            title: (
                <FormattedMessage
                    defaultMessage="Make the LED blink"
                    description="Step name for 'Make the LED blink' step"
                    id="gui.howtos.thingbot-getting-started.step_blink"
                />
            ),
            image: 'thingbotBlink'
        }, {
            title: (
                <FormattedMessage
                    defaultMessage="Set up the ultrasonic sensor"
                    description="Step name for 'Set up the ultrasonic sensor' step"
                    id="gui.howtos.thingbot-getting-started.step_ultrasonicSetup"
                />
            ),
            image: 'thingbotUltrasonicSetup'
        }, {
            title: (
                <FormattedMessage
                    defaultMessage="Print the distance to the Monitor"
                    description="Step name for 'Print the distance to the Monitor' step"
                    id="gui.howtos.thingbot-getting-started.step_ultrasonicRead"
                />
            ),
            image: 'thingbotUltrasonicRead'
        }],
        urlId: 'thingbot-getting-started'
    }
};

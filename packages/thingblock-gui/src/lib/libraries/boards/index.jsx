import React from 'react';
import {FormattedMessage} from 'react-intl';

import noBoardIconURL from './no-board.svg';

// GUI-only "host mode" tile: deselects the device and runs in the browser. Not a VM device, so it
// carries its own presentation here.
const noBoardTile = {
    deviceId: null,
    iconURL: noBoardIconURL,
    name: (
        <FormattedMessage
            defaultMessage="No board"
            description="Device card title for running without a board (host mode)"
            id="gui.boardLibrary.noBoard.name"
        />
    ),
    description: (
        <FormattedMessage
            defaultMessage="Run in the browser without a board."
            description="Device card description for host mode"
            id="gui.boardLibrary.noBoard.description"
        />
    )
};

export {
    noBoardTile
};

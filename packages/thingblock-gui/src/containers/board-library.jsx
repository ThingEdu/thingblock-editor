import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import VM from '@thingblock/thingblock-vm';
import intlShape from '../lib/intlShape.js';

import {noBoardTile} from '../lib/libraries/boards/index.jsx';

import LibraryComponent from '../components/library/library.jsx';
import DeviceCard from '../components/device-card/device-card.jsx';
import {closeBoardLibrary} from '../reducers/modals';
import {setDevice} from '../reducers/board';

const messages = defineMessages({
    deviceTitle: {
        defaultMessage: 'Choose a Device',
        description: 'Heading for the device selection library',
        id: 'gui.boardLibrary.chooseADevice'
    }
});

class BoardLibrary extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleItemSelect',
            'handlePacksLoaded',
            'renderItem'
        ]);
    }
    componentDidMount () {
        // Refresh if helper-served packs land while the library is open; if they loaded earlier,
        // getDeviceList() already includes them on first render.
        this.props.vm.on('RESOURCE_PACKS_LOADED', this.handlePacksLoaded);
    }
    componentWillUnmount () {
        this.props.vm.off('RESOURCE_PACKS_LOADED', this.handlePacksLoaded);
    }
    handlePacksLoaded () {
        this.forceUpdate();
    }
    handleItemSelect (item) {
        this.props.onSelectDevice(item.deviceId);
    }
    renderItem (item, key, onSelect) {
        return (
            <DeviceCard
                key={key}
                description={item.description}
                help={item.help}
                iconURL={item.iconURL}
                itemKey={key}
                learnMore={item.learnMore}
                manufacturer={item.manufacturer}
                name={item.name}
                requires={item.requires}
                onSelect={onSelect}
            />
        );
    }
    render () {
        if (!this.props.visible) return null;

        // VM devices own their presentation data. `rawURL` gives the library a stable per-item key
        // for items whose name is a localized node.
        const devices = this.props.vm.devices.getDeviceList().map(device => ({
            ...device,
            rawURL: device.iconURL
        }));
        const data = [
            {...noBoardTile, rawURL: noBoardTile.iconURL},
            ...devices
        ];
        return (
            <LibraryComponent
                data={data}
                filterable={false}
                fixedItemSize
                id="boardLibrary"
                renderItem={this.renderItem}
                title={this.props.intl.formatMessage(messages.deviceTitle)}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

BoardLibrary.propTypes = {
    intl: intlShape.isRequired,
    onRequestClose: PropTypes.func,
    onSelectDevice: PropTypes.func,
    visible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired
};

const mapStateToProps = state => ({
    visible: state.scratchGui.modals.boardLibrary,
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onRequestClose: () => dispatch(closeBoardLibrary()),
    onSelectDevice: deviceId => dispatch(setDevice(deviceId))
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(BoardLibrary));

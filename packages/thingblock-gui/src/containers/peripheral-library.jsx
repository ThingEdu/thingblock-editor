import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import VM from '@thingblock/thingblock-vm';
import intlShape from '../lib/intlShape.js';

import LibraryComponent from '../components/library/library.jsx';
import PeripheralCard from '../components/peripheral-card/peripheral-card.jsx';
import {closePeripheralLibrary} from '../reducers/modals';

const messages = defineMessages({
    peripheralTitle: {
        defaultMessage: 'Choose a Peripheral',
        description: 'Heading for the peripheral selection library',
        id: 'gui.peripheralLibrary.choosePeripheral'
    }
});

class PeripheralLibrary extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handlePacksChanged',
            'handleToggle',
            'renderItem'
        ]);
    }
    componentDidMount () {
        // The list and each card's state are derived from the VM, so refresh whenever packs land or the
        // active set changes (the user toggling a peripheral here, or a loaded project restoring one).
        this.props.vm.on('RESOURCE_PACKS_LOADED', this.handlePacksChanged);
        this.props.vm.on('PERIPHERALS_CHANGED', this.handlePacksChanged);
    }
    componentWillUnmount () {
        this.props.vm.off('RESOURCE_PACKS_LOADED', this.handlePacksChanged);
        this.props.vm.off('PERIPHERALS_CHANGED', this.handlePacksChanged);
    }
    handlePacksChanged () {
        this.forceUpdate();
    }
    handleToggle (id) {
        const item = this.props.vm.devices.getPeripheralList().find(p => p.id === id);
        if (!item || item.locked) return;
        if (item.active) {
            this.props.vm.devices.removePeripheral(id);
        } else {
            this.props.vm.devices.addPeripheral(id);
        }
    }
    renderItem (item) {
        // Toggle in place rather than going through the library's select handler, which would close the
        // modal — peripherals are added and removed without leaving the library.
        return (
            <PeripheralCard
                key={item.id}
                active={item.active}
                description={item.description}
                iconURL={item.iconURL}
                id={item.id}
                locked={item.locked}
                name={item.name}
                onToggle={this.handleToggle}
            />
        );
    }
    render () {
        if (!this.props.visible) return null;

        const data = this.props.vm.devices.getPeripheralList().map(item => ({
            ...item,
            rawURL: item.id
        }));
        return (
            <LibraryComponent
                data={data}
                filterable={false}
                fixedItemSize
                id="peripheralLibrary"
                renderItem={this.renderItem}
                title={this.props.intl.formatMessage(messages.peripheralTitle)}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

PeripheralLibrary.propTypes = {
    intl: intlShape.isRequired,
    onRequestClose: PropTypes.func,
    visible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired
};

const mapStateToProps = state => ({
    visible: state.scratchGui.modals.peripheralLibrary,
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onRequestClose: () => dispatch(closePeripheralLibrary())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(PeripheralLibrary));

import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import React from 'react';
import VM from '@thingblock/thingblock-vm';
import {
    thingbotLoaded,
    thingbotConnectSuccess,
    thingbotDisconnect
} from '../reducers/thingbot-telemetrix';
import {openConnectionModal} from '../reducers/modals';
import {confirmAsync} from '../lib/native-dialogs';
import {setConnectionModalExtensionId} from '../reducers/connection-modal';

const THINGBOT_EXTENSION_ID = 'thingbotTelemetrix';

// Mirror Runtime static event names to avoid importing the engine into GUI
const PERIPHERAL_CONNECTED = 'PERIPHERAL_CONNECTED';
const PERIPHERAL_DISCONNECTED = 'PERIPHERAL_DISCONNECTED';
const PERIPHERAL_REQUEST_ERROR = 'PERIPHERAL_REQUEST_ERROR';

const MenuBarHOC = function (WrappedComponent) {
    class MenuBarContainer extends React.PureComponent {
        constructor (props) {
            super(props);

            bindAll(this, [
                'confirmReadyToReplaceProject',
                'shouldSaveBeforeTransition',
                'handleExtensionAdded',
                'handleBLEConnected',
                'handleBLEDisconnected',
                'handleBLEError'
            ]);
        }

        componentDidMount () {
            this.props.vm.events.addListener('EXTENSION_ADDED', this.handleExtensionAdded);
            this.props.vm.events.addListener(PERIPHERAL_CONNECTED, this.handleBLEConnected);
            this.props.vm.events.addListener(PERIPHERAL_DISCONNECTED, this.handleBLEDisconnected);
            this.props.vm.events.addListener(PERIPHERAL_REQUEST_ERROR, this.handleBLEError);

            // Handle restored project (extension already loaded)
            if (this.props.vm.extensionManager.isExtensionLoaded(THINGBOT_EXTENSION_ID)) {
                this.props.onThingbotLoaded();
            }
        }

        componentWillUnmount () {
            this.props.vm.events.removeListener('EXTENSION_ADDED', this.handleExtensionAdded);
            this.props.vm.events.removeListener(PERIPHERAL_CONNECTED, this.handleBLEConnected);
            this.props.vm.events.removeListener(PERIPHERAL_DISCONNECTED, this.handleBLEDisconnected);
            this.props.vm.events.removeListener(PERIPHERAL_REQUEST_ERROR, this.handleBLEError);
        }

        handleExtensionAdded (categoryInfo) {
            if (categoryInfo.id === THINGBOT_EXTENSION_ID) {
                this.props.onThingbotLoaded();
            }
        }

        handleBLEConnected () {
            this.props.onThingbotConnectSuccess();
        }

        handleBLEDisconnected () {
            this.props.onThingbotDisconnect();
        }

        handleBLEError () {
            this.props.onThingbotDisconnect();
        }

        /**
         * Ask before replacing a changed project the user can't save in place.
         * @param {string} message - the question.
         * @param {object} [options] - button labels for the desktop dialog, see `confirmAsync`.
         * @returns {Promise<boolean>} whether the project may be replaced.
         */
        confirmReadyToReplaceProject (message, options) {
            if (this.props.projectChanged && !this.props.canCreateNew) {
                return Promise.resolve(this.props.confirmWithMessage(message, options));
            }
            return Promise.resolve(true);
        }

        shouldSaveBeforeTransition () {
            return (this.props.canSave && this.props.projectChanged);
        }

        render () {
            const {
                projectChanged: _projectChanged,
                onThingbotLoaded: _onThingbotLoaded,
                onThingbotConnectSuccess: _onThingbotConnectSuccess,
                onThingbotDisconnect: _onThingbotDisconnect,
                ...props
            } = this.props;
            return (<WrappedComponent
                confirmReadyToReplaceProject={this.confirmReadyToReplaceProject}
                shouldSaveBeforeTransition={this.shouldSaveBeforeTransition}
                {...props}
            />);
        }
    }

    MenuBarContainer.propTypes = {
        canCreateNew: PropTypes.bool,
        canSave: PropTypes.bool,
        confirmWithMessage: PropTypes.func,
        projectChanged: PropTypes.bool,
        vm: PropTypes.instanceOf(VM).isRequired,
        onThingbotLoaded: PropTypes.func.isRequired,
        onThingbotConnectSuccess: PropTypes.func.isRequired,
        onThingbotConnect: PropTypes.func.isRequired,
        onThingbotDisconnect: PropTypes.func.isRequired
    };

    MenuBarContainer.defaultProps = {
        // Awaited: in the desktop app the question is a native dialog that answers asynchronously.
        confirmWithMessage: (message, options) => confirmAsync(message, options)
    };

    const mapStateToProps = state => ({
        projectChanged: state.scratchGui.projectChanged,
        vm: state.scratchGui.vm,
        thingbotLoaded: state.scratchGui.thingbotTelemetrix.loaded,
        thingbotConnected: state.scratchGui.thingbotTelemetrix.connected,
        thingbotConnecting: state.scratchGui.thingbotTelemetrix.connecting
    });

    const mapDispatchToProps = dispatch => ({
        onThingbotLoaded: () => dispatch(thingbotLoaded()),
        onThingbotConnectSuccess: () => dispatch(thingbotConnectSuccess()),
        onThingbotDisconnect: () => dispatch(thingbotDisconnect()),
        onThingbotConnect: () => {
            dispatch(setConnectionModalExtensionId(THINGBOT_EXTENSION_ID));
            dispatch(openConnectionModal());
        }
    });

    return connect(
        mapStateToProps,
        mapDispatchToProps
    )(MenuBarContainer);
};

export default MenuBarHOC;

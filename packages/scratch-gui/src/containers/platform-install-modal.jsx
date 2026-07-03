import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import VM from '@scratch/scratch-vm';

import PlatformInstallModalComponent from '../components/platform-install-modal/platform-install-modal.jsx';

/**
 * Watches the selected board and, when its platform (core, e.g. `esp32:esp32`) isn't installed on
 * the helper, offers to download it and drives the install with streamed progress. Mounted once;
 * renders nothing until it has something to offer. Link-mode only: the cloud/Web Serial backend has
 * no platform manager (`getPlatformStatus` resolves null), and the linkMode gate skips the check
 * entirely so switching modes never probes the helper.
 */
class PlatformInstallModal extends React.Component {
    constructor (props) {
        super(props);
        this.handleInstall = this.handleInstall.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.state = {
            // null when the modal is closed; otherwise one of
            // 'prompt' | 'installing' | 'done' | 'cancelled' | 'error'.
            status: null,
            platformName: null,
            progress: null,
            logs: [],
            error: null
        };
        // The last device we prompted for: a dismissed prompt must not reappear until the user
        // selects a different board. Not state — it never affects rendering by itself.
        this._promptedDeviceId = null;
    }

    componentDidMount () {
        // A restored project can select its board before this mounts.
        this._maybePrompt();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.selectedDeviceId !== this.props.selectedDeviceId) {
            this._maybePrompt();
        }
    }

    componentWillUnmount () {
        this._unmounted = true;
    }

    _maybePrompt () {
        const {vm, selectedDeviceId, linkMode} = this.props;
        if (!selectedDeviceId || linkMode === 'cloud') return;
        if (this._promptedDeviceId === selectedDeviceId) return;
        // Never replace an install in progress; its outcome matters more than a new prompt.
        if (this.state.status === 'installing') return;

        vm.getPlatformStatus(selectedDeviceId)
            .then(platformStatus => {
                // Null means the active backend has no platform manager; a stale reply means the
                // user already moved on to another board.
                if (this._unmounted || !platformStatus) return;
                if (this.props.selectedDeviceId !== selectedDeviceId) return;
                if (platformStatus.installed) return;
                if (!platformStatus.known) {
                    // eslint-disable-next-line no-console
                    console.warn(`platform ${platformStatus.id} is not in the helper's indexes; ` +
                        'cannot offer to install it');
                    return;
                }
                this._promptedDeviceId = selectedDeviceId;
                this.setState({
                    status: 'prompt',
                    platformName: platformStatus.name,
                    progress: null,
                    logs: [],
                    error: null
                });
            })
            .catch(error => {
                // The helper being down is not this modal's problem; the upload flow surfaces it.
                // eslint-disable-next-line no-console
                console.warn(`platform status check failed: ${error.message}`);
            });
    }

    handleInstall () {
        const {vm, selectedDeviceId} = this.props;
        this.setState({status: 'installing', progress: null, logs: [], error: null});
        vm.installPlatform(selectedDeviceId, {
            onLog: chunk => {
                if (this._unmounted) return;
                this.setState(state => ({logs: [...state.logs, chunk]}));
            },
            onProgress: progress => {
                if (this._unmounted) return;
                this.setState({progress});
            }
        })
            .then(() => {
                if (this._unmounted) return;
                this.setState({status: 'done'});
            })
            .catch(error => {
                if (this._unmounted) return;
                // A user cancel rejects the in-flight install with the helper's 'cancelled' code;
                // show it as stopped rather than a failure.
                if (error && error.code === 'cancelled') {
                    this.setState({status: 'cancelled'});
                    return;
                }
                this.setState({status: 'error', error: error.message});
            });
    }

    handleCancel () {
        // Aborts the in-flight install; the rejected promise lands in handleInstall's catch and
        // flips the modal to 'cancelled'. Leaves the modal open showing that outcome.
        this.props.vm.cancelPlatformInstall();
    }

    handleClose () {
        this.setState({status: null});
    }

    render () {
        if (!this.state.status) return null;
        return (
            <PlatformInstallModalComponent
                status={this.state.status}
                platformName={this.state.platformName}
                progress={this.state.progress}
                logs={this.state.logs}
                error={this.state.error}
                onInstall={this.handleInstall}
                onCancel={this.handleCancel}
                onClose={this.handleClose}
            />
        );
    }
}

PlatformInstallModal.propTypes = {
    linkMode: PropTypes.string,
    selectedDeviceId: PropTypes.string,
    vm: PropTypes.instanceOf(VM).isRequired
};

const mapStateToProps = state => ({
    linkMode: state.scratchGui.settings.linkMode,
    selectedDeviceId: state.scratchGui.board.selectedDeviceId,
    vm: state.scratchGui.vm
});

export default connect(mapStateToProps)(PlatformInstallModal);

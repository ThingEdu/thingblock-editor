import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import saveProject from '../lib/save-project';
/**
 * Project saver component passes a downloadProject function to its child.
 * It expects this child to be a function with the signature
 *     function (className, downloadProject, saveProjectAs) {}
 * `downloadProject` saves to the project's file (asking where the first time), `saveProjectAs`
 * always asks. The component can then be used to attach project saving functionality
 * to any other component:
 *
 * <SB3Downloader>{(className, downloadProject) => (
 *     <MyCoolComponent
 *         onClick={downloadProject}
 *     />
 * )}</SB3Downloader>
 */
class SB3Downloader extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'downloadProject',
            'saveProjectAs'
        ]);
    }
    save (saveAs) {
        return saveProject({
            saveProjectSb3: this.props.saveProjectSb3,
            projectTitle: this.props.projectTitle,
            dispatch: this.props.dispatch,
            saveAs
        }).then(saved => {
            if (saved && this.props.onSaveFinished) {
                this.props.onSaveFinished();
            }
            return saved;
        });
    }
    downloadProject () {
        return this.save(false);
    }
    saveProjectAs () {
        return this.save(true);
    }
    render () {
        const {
            children
        } = this.props;
        return children(
            this.props.className,
            this.downloadProject,
            this.saveProjectAs
        );
    }
}

SB3Downloader.propTypes = {
    children: PropTypes.func,
    className: PropTypes.string,
    dispatch: PropTypes.func,
    onSaveFinished: PropTypes.func,
    projectTitle: PropTypes.string,
    saveProjectSb3: PropTypes.func
};
SB3Downloader.defaultProps = {
    className: ''
};

const mapStateToProps = state => ({
    saveProjectSb3: state.scratchGui.vm.project.saveSb3.bind(state.scratchGui.vm.project),
    projectTitle: state.scratchGui.projectTitle
});

export default connect(
    mapStateToProps,
    dispatch => ({dispatch})
)(SB3Downloader);

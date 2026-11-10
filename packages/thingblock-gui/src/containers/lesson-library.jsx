import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import LessonLibraryComponent from '../components/lesson-library/lesson-library.jsx';
import {loadProgress} from '../lib/lesson-progress';
import {blankLessonProject} from '../lib/lesson-starter';
import {confirmReplaceProject} from '../lib/native-dialogs';
import log from '../lib/log.js';
import {setDevice} from '../reducers/board';
import {openLesson} from '../reducers/lesson';
import {closeTipsLibrary} from '../reducers/modals';
import {setProjectUnchanged} from '../reducers/project-changed';
import {setProjectTitle} from '../reducers/project-title';

// Lessons are written in Vietnamese only for now.
const LESSON_LANG = 'vi';

const fetchJson = url => fetch(url).then(response => {
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
});

const fetchBytes = url => fetch(url).then(response => {
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.arrayBuffer();
});

const LessonLibrary = ({projectChanged, vm, onClose, onOpen}) => {
    const intl = useIntl();
    const [index, setIndex] = useState(null);
    const [error, setError] = useState(null);
    const base = vm.devices.getTutorialsOrigin();

    useEffect(() => {
        if (!base) {
            setError('no-link');
            return;
        }
        setError(null);
        fetchJson(`${base}/index.json`)
            .then(setIndex)
            .catch(() => setError('no-link'));
    }, [base]);

    const handleSelect = useCallback(async id => {
        // A lesson starts from its own project, so it replaces the learner's: ask first, as opening a
        // file does, when there are unsaved changes.
        if (projectChanged && !(await confirmReplaceProject(intl))) return;
        const baseUrl = `${base}/${id}/`;
        fetchJson(`${baseUrl}lesson.${LESSON_LANG}.json`)
            .then(lesson => {
                // The lesson's starting project, or a blank one on its board with its devices: never
                // the blocks of whatever was open before.
                const starter = lesson.start ?
                    fetchBytes(`${baseUrl}${lesson.start}`) :
                    Promise.resolve(blankLessonProject(lesson));
                return starter
                    .then(project => vm.project.load(project))
                    .then(() => lesson);
            })
            .then(lesson => {
                onOpen({...lesson, baseUrl}, loadProgress(id));
                // After the board is selected: a lesson's peripherals (the OLED, say) join the palette
                // without the learner having to find Add Peripheral.
                for (const peripheral of lesson.peripherals || []) {
                    vm.devices.addPeripheral(peripheral)
                        .catch(e => log.warn(`Lesson ${id}: cannot add "${peripheral}"`, e));
                }
            })
            .catch(e => {
                log.warn(`Lesson ${id}: cannot open`, e);
                setError('no-link');
            });
    }, [base, intl, onOpen, projectChanged, vm]);

    return (
        <LessonLibraryComponent
            error={error}
            lessons={index ? index.lessons : []}
            loading={!index && !error}
            tutorialsBase={base}
            onClose={onClose}
            onSelect={handleSelect}
        />
    );
};

LessonLibrary.propTypes = {
    projectChanged: PropTypes.bool,
    vm: PropTypes.shape({
        devices: PropTypes.shape({
            addPeripheral: PropTypes.func.isRequired,
            getTutorialsOrigin: PropTypes.func.isRequired
        }).isRequired,
        project: PropTypes.shape({
            load: PropTypes.func.isRequired
        }).isRequired
    }).isRequired,
    onClose: PropTypes.func.isRequired,
    onOpen: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    projectChanged: state.scratchGui.projectChanged,
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeTipsLibrary()),
    onOpen: (lesson, progress) => {
        // The lesson's project has just replaced the old one: nothing is unsaved yet.
        dispatch(setProjectUnchanged());
        dispatch(setProjectTitle(lesson.name));
        // `board: none` lessons teach choosing the board, so they open without selecting one.
        if (lesson.board && lesson.board !== 'none') dispatch(setDevice(lesson.board));
        dispatch(openLesson(lesson, progress));
        dispatch(closeTipsLibrary());
    }
});

export default connect(mapStateToProps, mapDispatchToProps)(LessonLibrary);

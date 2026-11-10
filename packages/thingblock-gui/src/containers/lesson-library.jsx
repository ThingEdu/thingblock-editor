import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useState} from 'react';
import {FormattedMessage, useIntl} from 'react-intl';
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

const GROUP_TITLES = {
    'lam-quen': (
        <FormattedMessage
            defaultMessage="Getting started"
            description="Lesson group"
            id="gui.lessonLibrary.group.lamQuen"
        />
    ),
    'dau-ra': (
        <FormattedMessage
            defaultMessage="Outputs: lights and buzzer"
            description="Lesson group"
            id="gui.lessonLibrary.group.dauRa"
        />
    ),
    'dong-co': (
        <FormattedMessage
            defaultMessage="Motors and servos"
            description="Lesson group"
            id="gui.lessonLibrary.group.dongCo"
        />
    ),
    'dau-vao': (
        <FormattedMessage
            defaultMessage="Inputs and the OLED"
            description="Lesson group"
            id="gui.lessonLibrary.group.dauVao"
        />
    ),
    'camera-ai': (
        <FormattedMessage
            defaultMessage="Camera AI (no board)"
            description="Lesson group: lessons with the webcam and the Camera AI blocks, which need no board"
            id="gui.lessonLibrary.group.cameraAi"
        />
    )
};
const GROUP_ORDER = Object.keys(GROUP_TITLES);

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

    const handleSelect = useCallback(async ma => {
        // A lesson starts from its own project, so it replaces the learner's: ask first, as opening a
        // file does, when there are unsaved changes.
        if (projectChanged && !(await confirmReplaceProject(intl))) return;
        const baseUrl = `${base}/${ma}/`;
        fetchJson(`${baseUrl}bai.${LESSON_LANG}.json`)
            .then(lesson => {
                // The lesson's starting project, or a blank one on its board with its devices: never
                // the blocks of whatever was open before.
                const starter = lesson.batDau ?
                    fetchBytes(`${baseUrl}${lesson.batDau}`) :
                    Promise.resolve(blankLessonProject(lesson));
                return starter
                    .then(project => vm.project.load(project))
                    .then(() => lesson);
            })
            .then(lesson => {
                onOpen({...lesson, baseUrl}, loadProgress(ma));
                // After the board is selected: a lesson's peripherals (the OLED, say) join the palette
                // without the learner having to find Add Peripheral.
                for (const id of lesson.thietBi || []) {
                    vm.devices.addPeripheral(id).catch(e => log.warn(`Lesson ${ma}: cannot add "${id}"`, e));
                }
                // Editor extensions such as Camera AI, which run without a board.
                for (const id of lesson.moRong || []) {
                    if (vm.extensionManager.isExtensionLoaded(id)) continue;
                    vm.extensionManager.loadExtensionURL(id)
                        .catch(e => log.warn(`Lesson ${ma}: cannot load extension "${id}"`, e));
                }
            })
            .catch(e => {
                log.warn(`Lesson ${ma}: cannot open`, e);
                setError('no-link');
            });
    }, [base, intl, onOpen, projectChanged, vm]);

    const lessons = index ? index.lessons : [];
    const groups = GROUP_ORDER
        .map(id => ({id, title: GROUP_TITLES[id], lessons: lessons.filter(l => l.nhom === id)}))
        .filter(g => g.lessons.length);
    const progressByMa = {};
    for (const lesson of lessons) {
        const progress = loadProgress(lesson.ma);
        if (progress) progressByMa[lesson.ma] = progress;
    }

    return (
        <LessonLibraryComponent
            error={error}
            groups={groups}
            loading={!index && !error}
            progressByMa={progressByMa}
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
        extensionManager: PropTypes.shape({
            isExtensionLoaded: PropTypes.func.isRequired,
            loadExtensionURL: PropTypes.func.isRequired
        }),
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
        dispatch(setProjectTitle(lesson.ten));
        // `bo: khong` lessons teach choosing the board, so they open without selecting one.
        if (lesson.bo && lesson.bo !== 'khong') dispatch(setDevice(lesson.bo));
        dispatch(openLesson(lesson, progress));
        dispatch(closeTipsLibrary());
    }
});

export default connect(mapStateToProps, mapDispatchToProps)(LessonLibrary);

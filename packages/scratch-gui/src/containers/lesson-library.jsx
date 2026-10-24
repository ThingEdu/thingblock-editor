import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useState} from 'react';
import {FormattedMessage} from 'react-intl';
import {connect} from 'react-redux';
import LessonLibraryComponent from '../components/lesson-library/lesson-library.jsx';
import {loadProgress} from '../lib/lesson-progress';
import {setDevice} from '../reducers/board';
import {openLesson} from '../reducers/lesson';
import {closeTipsLibrary} from '../reducers/modals';

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
    )
};
const GROUP_ORDER = Object.keys(GROUP_TITLES);

const fetchJson = url => fetch(url).then(response => {
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
});

const LessonLibrary = ({vm, onClose, onOpen}) => {
    const [index, setIndex] = useState(null);
    const [error, setError] = useState(null);
    const root = vm.getResourceRoot();

    useEffect(() => {
        if (!root) {
            setError('no-link');
            return;
        }
        setError(null);
        fetchJson(`${root}/tutorials/index.json`)
            .then(setIndex)
            .catch(() => setError('no-link'));
    }, [root]);

    const handleSelect = useCallback(ma => {
        const baseUrl = `${root}/tutorials/${ma}/`;
        fetchJson(`${baseUrl}bai.${LESSON_LANG}.json`)
            .then(lesson => onOpen({...lesson, baseUrl}, loadProgress(ma)))
            .catch(() => setError('no-link'));
    }, [root, onOpen]);

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
    vm: PropTypes.shape({getResourceRoot: PropTypes.func.isRequired}).isRequired,
    onClose: PropTypes.func.isRequired,
    onOpen: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeTipsLibrary()),
    onOpen: (lesson, progress) => {
        // `bo: khong` lessons teach choosing the board, so they open without selecting one.
        if (lesson.bo && lesson.bo !== 'khong') dispatch(setDevice(lesson.bo));
        dispatch(openLesson(lesson, progress));
        dispatch(closeTipsLibrary());
    }
});

export default connect(mapStateToProps, mapDispatchToProps)(LessonLibrary);

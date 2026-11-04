/**
 * The project a lesson opens in when it has no starting project of its own: a blank sprite on the
 * lesson's board, with the devices the lesson needs already in the palette.
 */

/** The placeholder costume every ThingBlock save references; the editor ships the asset. */
const COSTUME = {
    name: 'costume1',
    assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
    md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
    dataFormat: 'svg'
};

/**
 * @param {{bo: ?string, thietBi: ?Array<string>}} lesson The lesson: its board (`khong` for none) and
 *     extra devices.
 * @returns {object} A project.json object for `vm.project.load`.
 */
const blankLessonProject = lesson => ({
    targets: [
        {
            isStage: true,
            name: 'Stage',
            variables: {},
            lists: {},
            broadcasts: {},
            blocks: {},
            comments: {},
            currentCostume: 0,
            costumes: [COSTUME],
            sounds: [],
            volume: 100,
            layerOrder: 0,
            tempo: 60,
            videoTransparency: 50,
            videoState: 'on',
            textToSpeechLanguage: null
        },
        {
            isStage: false,
            name: 'Sprite1',
            variables: {},
            lists: {},
            broadcasts: {},
            blocks: {},
            comments: {},
            currentCostume: 0,
            costumes: [COSTUME],
            sounds: [],
            volume: 100,
            layerOrder: 1,
            visible: true,
            x: 0,
            y: 0,
            size: 100,
            direction: 90,
            draggable: false,
            rotationStyle: 'all around'
        }
    ],
    monitors: [],
    extensions: [],
    meta: {semver: '3.0.0', vm: '14.1.0', agent: 'thingblock-gui/lesson'},
    board: lesson.bo && lesson.bo !== 'khong' ?
        {device: lesson.bo, peripherals: lesson.thietBi || []} :
        null
});

export {blankLessonProject};

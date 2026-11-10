import vi from '../../../src/locales/vi.json';

// The strings QA found still in English with the editor in Tiếng Việt (#48).
const REQUIRED = [
    'gui.menuBar.settings',
    'gui.menuBar.selectBoard',
    'gui.menuBar.lessonsLibrary',
    'gui.menuBar.debug',
    'gui.serialLog.monitor',
    'gui.sharedMessages.loadFromComputerTitle',
    'gui.sharedMessages.replaceProjectWarning',
    'gui.lessonPanel.failed',
    'gui.lessonPanel.passed',
    'gui.lessonPanel.idle',
    'gui.lessonPanel.waiting',
    'gui.lessonLibrary.group.lamQuen',
    'gui.lessonLibrary.group.dauRa',
    'gui.lessonLibrary.group.dongCo',
    'gui.lessonLibrary.group.dauVao',
    'gui.lessonLibrary.group.cameraAi',
    'gui.exampleLibrary.groupCameraAi',
    // Playing Camera AI without a webcam.
    'gui.playgroundPanel.mouse',
    'gui.playgroundPanel.useMouse',
    'gui.playgroundPanel.mouseHint',
    'cameraAi.menu.mouse',
    'gui.gui.addPeripheral',
    // Live mode and Arduino pin blocks, which the VM resolves from the editor's messages.
    'thingbotTelemetrix.controlDC',
    'arduino.digitalRead'
];

test.each(REQUIRED)('%s has a Vietnamese translation', id => {
    expect(typeof vi[id]).toBe('string');
    expect(vi[id].length).toBeGreaterThan(0);
});

test('block arguments keep their [NAME] slots in translation', () => {
    expect(vi['thingbotTelemetrix.controlDC']).toContain('[MOTOR_ID]');
    expect(vi['thingbotTelemetrix.controlDC']).toContain('[SPEED]');
    expect(vi['arduino.digitalWrite']).toContain('[PIN]');
    expect(vi['arduino.digitalWrite']).toContain('[LEVEL]');
});

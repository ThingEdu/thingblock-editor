import classNames from 'classnames';
import omit from 'lodash.omit';
import PropTypes from 'prop-types';
import React, {useEffect, useCallback, useRef, useState} from 'react';
import {defineMessages, FormattedMessage, useIntl} from 'react-intl';
import {connect} from 'react-redux';
import MediaQuery from 'react-responsive';
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs';
import tabStyles from 'react-tabs/style/react-tabs.css';
import VM from '@thingblock/thingblock-vm';

import Blocks from '../../containers/blocks.jsx';
import SidePanel from '../side-panel/side-panel.jsx';
import Loader from '../loader/loader.jsx';
import Box from '../box/box.jsx';
import MenuBar from '../menu-bar/menu-bar.jsx';

import ExtensionsButton from '../extension-button/extension-button.jsx';
import LessonLibrary from '../../containers/lesson-library.jsx';
import LessonPanel from '../../containers/lesson-panel.jsx';
import Alerts from '../../containers/alerts.jsx';
import DragLayer from '../../containers/drag-layer.jsx';
import ConnectionModal from '../../containers/connection-modal.jsx';
import TelemetryModal from '../telemetry-modal/telemetry-modal.jsx';
import BoardLibrary from '../../containers/board-library.jsx';
import ExampleLibrary from '../../containers/example-library.jsx';
import PeripheralLibrary from '../../containers/peripheral-library.jsx';

import layout, {STAGE_SIZE_MODES} from '../../lib/layout-constants';
import {resolveStageSize} from '../../lib/screen-utils';
import {colorModeMap} from '../../lib/settings/color-mode/index.js';
import {DEFAULT_THEME, themeMap} from '../../lib/settings/theme/index.js';
import {AccountMenuOptionsPropTypes} from '../../lib/account-menu-options';

import styles from './gui.css';
import codeIcon from './icon--code.svg';
import DebugModal from '../debug-modal/debug-modal.jsx';
import SettingsModal from '../../containers/settings-modal.jsx';
import {setPlatform} from '../../reducers/platform.js';
import {setTheme} from '../../reducers/settings.js';
import {PLATFORM} from '../../lib/platform.js';
import {MenuRefProvider} from '../../contexts/menu-ref-context.jsx';
import {ModalFocusProvider} from '../../contexts/modal-focus-context.jsx';

/** Widest the device panel starts while a lesson is open, so the workspace keeps room beside the lesson. */
const LESSON_DEVICE_PANEL_WIDTH = 380;

const ariaMessages = defineMessages({
    menuBar: {
        id: 'gui.aria.menuBar',
        defaultMessage: 'Menu topbar',
        description: 'accessibility label for the top menu bar'
    },
    editor: {
        id: 'gui.aria.editor',
        defaultMessage: 'Editor',
        description: 'accessibility label for the main editor area'
    },
    tabList: {
        id: 'gui.aria.tabList',
        defaultMessage: 'Tab list',
        description: 'accessibility label for the editor tab list'
    },
    codePanel: {
        id: 'gui.aria.codePanel',
        defaultMessage: 'Code editor panel',
        description: 'accessibility label for the code editor panel'
    },
    stage: {
        id: 'gui.aria.stage',
        defaultMessage: 'Stage',
        description: 'accessibility label for the stage'
    }
});

const GUIComponent = props => {
    const intl = useIntl();
    const {
        accountMenuOptions,
        activeTabIndex,
        alertsVisible,
        authorId,
        authorThumbnailUrl,
        authorUsername,
        authorAvatarBadge,
        basePath,
        blocksId,
        blocksTabVisible,
        canChangeLanguage,
        canChangeColorMode,
        canChangeTheme,
        canCreateNew,
        canEditTitle,
        canManageFiles,
        canRemix,
        canSave,
        canCreateCopy,
        canShare,
        children,
        connectionModalVisible,
        debugModalVisible,
        onDebugModalClose,
        enableCommunity,
        hasActiveMembership,
        isCreating,
        isFetchingUserData,
        isFullScreen,
        isRtl,
        isShared,
        isTelemetryEnabled,
        isTotallyNormal,
        lessonOpen,
        loading,
        logo,
        menuBarHidden,
        renderLogin,
        onClickAbout,
        onLogOut,
        onClickLogin,
        onOpenRegistration,
        onToggleLoginOpen,
        onActivateTab,
        onClickLogo,
        onExtensionButtonClick,
        onOpenPeripheralLibrary,
        onProjectTelemetryEvent,
        onRequestCloseDebugModal,
        onRequestCloseSettingsModal,
        onRequestCloseTelemetryModal,
        onSeeCommunity,
        onShare,
        onShowPrivacyPolicy,
        onStartLoadingExample,
        onStartSelectingFileUpload,
        onTelemetryModalCancel,
        onTelemetryModalOptIn,
        onTelemetryModalOptOut,
        showNewFeatureCallouts,
        stageSizeMode,
        selectedDeviceId,
        generatedCode,
        settingsModalVisible,
        telemetryModalVisible,
        colorMode,
        theme,
        tipsLibraryVisible,
        useExternalPeripheralList,
        username,
        userOwnsProject,
        vm,
        ...componentProps
    } = omit(props, 'dispatch', 'setPlatform');
    if (children) {
        return <Box {...componentProps}>{children}</Box>;
    }

    useEffect(() => {
        if (props.platform) {
            // TODO: This uses the imported `setPlatform` directly,
            // but it should probably use the dispatched version from props.
            setPlatform(props.platform);
        }
    }, [props.platform]);

    useEffect(() => {
        if (
            !isFetchingUserData &&
            !themeMap[theme]?.isAvailable?.({hasActiveMembership})
        ) {
            // If the preferred theme is not available, fall back to default.
            // TODO: It would be cleaner to do this on redux init.
            props.setTheme(DEFAULT_THEME);
        }
    }, [theme, hasActiveMembership, props.setTheme]);

    const [devicePanelWidth, setDevicePanelWidth] = useState(540);

    useEffect(() => {
        window.dispatchEvent(new Event('resize'));
    }, [devicePanelWidth]);

    // The lesson column takes room from the workspace, so the device panel narrows while a lesson is open
    // and goes back to the width it had when the lesson closes.
    const widthBeforeLesson = useRef(null);
    useEffect(() => {
        if (lessonOpen) {
            widthBeforeLesson.current = devicePanelWidth;
            setDevicePanelWidth(Math.min(devicePanelWidth, LESSON_DEVICE_PANEL_WIDTH));
        } else if (widthBeforeLesson.current !== null) {
            setDevicePanelWidth(widthBeforeLesson.current);
            widthBeforeLesson.current = null;
        }
    }, [lessonOpen]);

    const handleResizeMouseDown = useCallback(e => {
        const startX = e.clientX;
        const startWidth = devicePanelWidth;

        const onMouseMove = moveEvent => {
            const delta = startX - moveEvent.clientX;
            setDevicePanelWidth(Math.max(360, Math.min(700, startWidth + delta)));
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
    }, [devicePanelWidth]);

    const tabClassNames = {
        tabs: styles.tabs,
        tab: classNames(tabStyles.reactTabsTab, styles.tab),
        tabList: classNames(tabStyles.reactTabsTabList, styles.tabList),
        tabPanel: classNames(tabStyles.reactTabsTabPanel, styles.tabPanel),
        tabPanelSelected: classNames(tabStyles.reactTabsTabPanelSelected, styles.isSelected),
        tabSelected: classNames(tabStyles.reactTabsTabSelected, styles.isSelected)
    };

    const onCloseDebugModal = useCallback(() => {
        if (onDebugModalClose) {
            onDebugModalClose();
        }
        onRequestCloseDebugModal();
    }, [onDebugModalClose, onRequestCloseDebugModal]);

    return (<MediaQuery minWidth={layout.fullSizeMinWidth}>{isFullSize => {
        const stageSize = resolveStageSize(stageSizeMode, isFullSize);
        const blocksMedia = `${basePath}static/${colorModeMap[colorMode].blocksMediaFolder}/`;
        const boxStyles = classNames(styles.bodyWrapper, {
            [styles.bodyWrapperWithoutMenuBar]: menuBarHidden
        });

        return (
            <ModalFocusProvider>
                <Box
                    className={styles.pageWrapper}
                    dir={isRtl ? 'rtl' : 'ltr'}
                    {...componentProps}
                >
                    {telemetryModalVisible ? (
                        <TelemetryModal
                            isRtl={isRtl}
                            isTelemetryEnabled={isTelemetryEnabled}
                            onCancel={onTelemetryModalCancel}
                            onOptIn={onTelemetryModalOptIn}
                            onOptOut={onTelemetryModalOptOut}
                            onRequestClose={onRequestCloseTelemetryModal}
                            onShowPrivacyPolicy={onShowPrivacyPolicy}
                        />
                    ) : null}
                    {loading ? (
                        <Loader />
                    ) : null}
                    {isCreating ? (
                        <Loader messageId="gui.loader.creating" />
                    ) : null}
                    {tipsLibraryVisible ? <LessonLibrary /> : null}
                    <BoardLibrary />
                    {onStartLoadingExample ? <ExampleLibrary onSelectExample={onStartLoadingExample} /> : null}
                    <PeripheralLibrary />
                    {alertsVisible ? (
                        <Alerts className={styles.alertsContainer} />
                    ) : null}
                    {connectionModalVisible ? (
                        <ConnectionModal
                            useExternalPeripheralList={useExternalPeripheralList}
                            vm={vm}
                        />
                    ) : null}
                    {<DebugModal
                        isOpen={debugModalVisible}
                        onClose={onCloseDebugModal}
                    />}
                    {settingsModalVisible ? (
                        <SettingsModal onRequestClose={onRequestCloseSettingsModal} />
                    ) : null}
                    {/* TODO - in case of moving MenuRefProvider which seems likely,
                    make sure to move it from tests as well */}
                    {!menuBarHidden && <MenuRefProvider>
                        <MenuBar
                            ariaRole="banner"
                            ariaLabel={intl.formatMessage(ariaMessages.menuBar)}
                            authorId={authorId}
                            authorThumbnailUrl={authorThumbnailUrl}
                            authorUsername={authorUsername}
                            authorAvatarBadge={authorAvatarBadge}
                            canChangeLanguage={canChangeLanguage}
                            canChangeColorMode={canChangeColorMode}
                            canChangeTheme={canChangeTheme}
                            canCreateCopy={canCreateCopy}
                            canCreateNew={canCreateNew}
                            canEditTitle={canEditTitle}
                            canManageFiles={canManageFiles}
                            canRemix={canRemix}
                            canSave={canSave}
                            canShare={canShare}
                            className={styles.menuBarPosition}
                            enableCommunity={enableCommunity}
                            hasActiveMembership={hasActiveMembership}
                            isShared={isShared}
                            isTotallyNormal={isTotallyNormal}
                            logo={logo}
                            renderLogin={renderLogin}
                            onClickAbout={onClickAbout}
                            onClickLogo={onClickLogo}
                            onLogOut={onLogOut}
                            onClickLogin={onClickLogin}
                            onOpenRegistration={onOpenRegistration}
                            onProjectTelemetryEvent={onProjectTelemetryEvent}
                            onSeeCommunity={onSeeCommunity}
                            onShare={onShare}
                            onStartSelectingFileUpload={onStartSelectingFileUpload}
                            onToggleLoginOpen={onToggleLoginOpen}
                            userOwnsProject={userOwnsProject}
                            username={username}
                            accountMenuOptions={accountMenuOptions}
                        />
                    </MenuRefProvider>
                    }
                    <Box className={classNames(boxStyles, styles.flexWrapper)}>
                        <Box
                            role="main"
                            aria-label={intl.formatMessage(ariaMessages.editor)}
                            className={styles.editorWrapper}
                            element="main"
                        >
                            <Tabs
                                forceRenderTabPanel
                                className={tabClassNames.tabs}
                                selectedIndex={activeTabIndex}
                                selectedTabClassName={tabClassNames.tabSelected}
                                selectedTabPanelClassName={tabClassNames.tabPanelSelected}
                                onSelect={onActivateTab}

                                // TODO: focusTabOnClick should be true for accessibility, but currently conflicts
                                // with nudge operations in the paint editor. We'll likely need to manage focus
                                // differently within the paint editor before we can turn this back on.
                                // Repro steps:
                                // 1. Click the Costumes tab
                                // 2. Select something in the paint editor (say, the cat's face)
                                // 3. Press the left or right arrow key
                                // Desired behavior: the face should nudge left or right
                                // Actual behavior: the Code or Sounds tab is now focused
                                focusTabOnClick={false}
                            >
                                <Box
                                    role="region"
                                    aria-label={intl.formatMessage(ariaMessages.tabList)}
                                >
                                    <TabList
                                        className={tabClassNames.tabList}
                                        role="tablist"
                                    >
                                        <Tab
                                            className={tabClassNames.tab}
                                            tabIndex="0"
                                            role="tab"
                                        >
                                            <img
                                                draggable={false}
                                                src={codeIcon}
                                            />
                                            <FormattedMessage
                                                defaultMessage="Code"
                                                description="Button to get to the code panel"
                                                id="gui.gui.codeTab"
                                            />
                                        </Tab>
                                    </TabList>
                                </Box>
                                <TabPanel
                                    className={tabClassNames.tabPanel}
                                    role="tabpanel"
                                >
                                    <Box
                                        className={styles.blocksWrapper}
                                        role="region"
                                        aria-label={intl.formatMessage(ariaMessages.codePanel)}
                                        element="section"
                                    >
                                        {lessonOpen && <LessonPanel />}
                                        <div className={styles.blocksArea}>
                                            <Blocks
                                                key={`${blocksId}/${colorMode}/${theme}`}
                                                grow={1}
                                                isVisible={blocksTabVisible}
                                                options={{media: blocksMedia}}
                                                stageSize={stageSize}
                                                theme={theme}
                                                vm={vm}
                                                colorMode={colorMode}
                                            />
                                            <ExtensionsButton
                                                boardMode={Boolean(selectedDeviceId)}
                                                intl={intl}
                                                onExtensionButtonClick={
                                                    selectedDeviceId ? onOpenPeripheralLibrary : onExtensionButtonClick
                                                }
                                            />
                                        </div>
                                    </Box>
                                </TabPanel>
                            </Tabs>
                        </Box>

                        <div
                            className={styles.resizeHandle}
                            onMouseDown={handleResizeMouseDown}
                        />
                        <SidePanel
                            generatedCode={generatedCode}
                            selectedDeviceId={selectedDeviceId}
                            vm={vm}
                            width={devicePanelWidth}
                        />
                    </Box>
                    <DragLayer />
                </Box>
            </ModalFocusProvider>
        );
    }}</MediaQuery>);
};

GUIComponent.propTypes = {
    accountMenuOptions: AccountMenuOptionsPropTypes,
    activeTabIndex: PropTypes.number,
    authorId: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]), // can be false
    authorThumbnailUrl: PropTypes.string,
    authorUsername: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]), // can be false
    authorAvatarBadge: PropTypes.number,
    basePath: PropTypes.string,
    blocksTabVisible: PropTypes.bool,
    blocksId: PropTypes.string,
    canChangeLanguage: PropTypes.bool,
    canChangeColorMode: PropTypes.bool,
    canChangeTheme: PropTypes.bool,
    canCreateCopy: PropTypes.bool,
    canCreateNew: PropTypes.bool,
    canEditTitle: PropTypes.bool,
    canManageFiles: PropTypes.bool,
    canRemix: PropTypes.bool,
    canSave: PropTypes.bool,
    canShare: PropTypes.bool,
    children: PropTypes.node,
    debugModalVisible: PropTypes.bool,
    hasActiveMembership: PropTypes.bool,
    onDebugModalClose: PropTypes.func,
    enableCommunity: PropTypes.bool,
    isCreating: PropTypes.bool,
    isFetchingUserData: PropTypes.bool,
    isFullScreen: PropTypes.bool,
    isRtl: PropTypes.bool,
    isShared: PropTypes.bool,
    isTotallyNormal: PropTypes.bool,
    lessonOpen: PropTypes.bool,
    loading: PropTypes.bool,
    logo: PropTypes.string,
    menuBarHidden: PropTypes.bool,
    onActivateTab: PropTypes.func,
    onClickLogo: PropTypes.func,
    onExtensionButtonClick: PropTypes.func,
    onOpenPeripheralLibrary: PropTypes.func,
    onLogOut: PropTypes.func,
    onClickLogin: PropTypes.func,
    onOpenRegistration: PropTypes.func,
    onRequestCloseDebugModal: PropTypes.func,
    onRequestCloseSettingsModal: PropTypes.func,
    onRequestCloseTelemetryModal: PropTypes.func,
    onSeeCommunity: PropTypes.func,
    onShare: PropTypes.func,
    onShowPrivacyPolicy: PropTypes.func,
    onStartLoadingExample: PropTypes.func,
    onStartSelectingFileUpload: PropTypes.func,
    onTabSelect: PropTypes.func,
    onTelemetryModalCancel: PropTypes.func,
    onTelemetryModalOptIn: PropTypes.func,
    onTelemetryModalOptOut: PropTypes.func,
    onToggleLoginOpen: PropTypes.func,
    platform: PropTypes.oneOf(Object.keys(PLATFORM)),
    renderLogin: PropTypes.func,
    setTheme: PropTypes.func.isRequired,
    selectedDeviceId: PropTypes.string,
    generatedCode: PropTypes.string,
    settingsModalVisible: PropTypes.bool,
    showNewFeatureCallouts: PropTypes.bool,
    stageSizeMode: PropTypes.oneOf(Object.keys(STAGE_SIZE_MODES)),
    setPlatform: PropTypes.func,
    telemetryModalVisible: PropTypes.bool,
    colorMode: PropTypes.string,
    theme: PropTypes.string,
    tipsLibraryVisible: PropTypes.bool,
    useExternalPeripheralList: PropTypes.bool, // true for CDM, false for normal Scratch Link
    username: PropTypes.string,
    userOwnsProject: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired
};

GUIComponent.defaultProps = {
    basePath: './',
    blocksId: 'original',
    // TODO: Currently all of those are always true. Do we actually need them?
    canChangeLanguage: true,
    canChangeColorMode: true,
    canChangeTheme: true,
    canCreateNew: false,
    canEditTitle: false,
    canManageFiles: true,
    canRemix: false,
    canSave: false,
    canCreateCopy: false,
    canShare: false,
    enableCommunity: false,
    isCreating: false,
    isShared: false,
    isTotallyNormal: false,
    loading: false,
    menuBarHidden: false,
    showNewFeatureCallouts: false,
    stageSizeMode: STAGE_SIZE_MODES.large,
    useExternalPeripheralList: false
};

const mapStateToProps = state => ({
    // This is the button's mode, as opposed to the actual current state
    blocksId: state.scratchGui.timeTravel.year.toString(),
    stageSizeMode: state.scratchGui.stageSize.stageSize,
    colorMode: state.scratchGui.settings.colorMode,
    theme: state.scratchGui.settings.theme
});

const mapDispatchToProps = dispatch => ({
    setPlatform: platform => dispatch(setPlatform(platform)),
    setTheme: theme => dispatch(setTheme(theme))
});

export default connect(mapStateToProps,
    mapDispatchToProps)(GUIComponent);
